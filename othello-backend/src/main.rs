use actix_cors::Cors;
use actix_web::{
    get,
    middleware,
    post,
    web::{ self, ServiceConfig },
    HttpRequest,
    HttpResponse,
    Responder,
};
use actix_ws::Message;
use futures::StreamExt;
use othello_agent::{
    agent::{ rule_based::RuleAgent, traits::Agent },
    gameplay::{
        constants::CODE_CHARS,
        encoding::{ board_from_string, create_code_char_hash },
        types::{ IBoard, IPlayer, IPosition },
        utils::piece_index_from_position,
    },
};
use serde::{ Deserialize, Serialize };
use shuttle_actix_web::ShuttleActixWeb;
use std::{ collections::HashMap, sync::{ atomic::AtomicUsize, Arc } };
use tokio::sync::{ mpsc::{ self, UnboundedReceiver, UnboundedSender }, RwLock };

type AppState = (mpsc::UnboundedSender<WsState>, Users, Rooms);

#[derive(Debug, Clone)]
enum WsState {
    Connected,
    Disconnected,
}

#[derive(Serialize, Deserialize)]
struct Msg {
    name: String,
    uid: Option<usize>,
    message: String,
}

type Users = Arc<RwLock<HashMap<usize, UnboundedSender<Message>>>>;
type Rooms = Arc<RwLock<HashMap<String, Vec<usize>>>>;

static NEXT_USERID: AtomicUsize = AtomicUsize::new(1);

async fn echo_handler(
    mut session: actix_ws::Session,
    mut msg_stream: actix_ws::MessageStream,
    tx: mpsc::UnboundedSender<WsState>,
    users: Users,
    rooms: Rooms
) {
    // generate a unique id for this user
    let uid = NEXT_USERID.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
    let (chat_tx, mut chat_rx): (
        UnboundedSender<Message>,
        UnboundedReceiver<Message>,
    ) = mpsc::unbounded_channel();
    users.write().await.insert(uid, chat_tx);
    // add user to the general room
    rooms.write().await.entry("general".to_string()).or_insert(Vec::new()).push(uid);
    let mut session_2 = session.clone();
    tokio::spawn(async move {
        while let Some(msg) = chat_rx.recv().await {
            let msg_txt = match msg {
                Message::Text(txt) => txt,
                _ => {
                    continue;
                }
            };
            session_2.text(msg_txt).await.expect("Failed to send message");
        }
    });
    while let Some(Ok(msg)) = msg_stream.next().await {
        match msg {
            Message::Ping(bytes) => {
                if session.pong(&bytes).await.is_err() {
                    return;
                }
            }
            Message::Text(s) => {
                // first parse the message too see if it incudes a command
                let msg = s.trim();
                if msg.starts_with('/') {
                    let v: Vec<&str> = msg.splitn(2, ' ').collect();
                    match v[0] {
                        "/join" => {
                            if v.len() == 2 {
                                let room = v[1].to_owned();
                                // remove user from the current room
                                let mut room_name_with_user: Option<String> = None;
                                for (room_name, room) in rooms.write().await.iter() {
                                    if room.contains(&uid) {
                                        room_name_with_user = Some(room_name.clone());
                                        break;
                                    }
                                }
                                if let Some(room_name) = room_name_with_user {
                                    if let Some(room) = rooms.write().await.get_mut(&room_name) {
                                        room.retain(|&x| x != uid);
                                    }
                                }
                                // add user to the room
                                rooms
                                    .write().await
                                    .entry(room.clone())
                                    .or_insert(Vec::new())
                                    .push(uid);

                                // notify others that someone joined
                                broadcast_msg(
                                    format!("Someone joined"),
                                    &users,
                                    &rooms,
                                    uid,
                                    vec![uid]
                                ).await;
                            } else {
                                println!("Room name is required");
                            }
                        }
                        _ => {}
                    }
                } else {
                    // broadcast the message to everyone else in the room
                    broadcast_msg(msg.to_string(), &users, &rooms, uid, vec![uid]).await;
                }
            }
            _ => {
                break;
            }
        }
    }

    if let Err(e) = tx.send(WsState::Disconnected) {
        println!("Failed to send disconnected state: {e:?}");
    }
    // remove user from the current room
    // first find the room the user is in
    let mut room_name_with_user: Option<String> = None;
    for (room_name, room) in rooms.write().await.iter() {
        if room.contains(&uid) {
            room_name_with_user = Some(room_name.clone());
            break;
        }
    }
    // then remove the user from the room
    if let Some(room_name) = room_name_with_user {
        if let Some(room) = rooms.write().await.get_mut(&room_name) {
            room.retain(|&x| x != uid);
        }
    }
    // broadcast that the user has left
    broadcast_msg(format!("Someone disconnected"), &users, &rooms, uid, vec![uid]).await;
    // remove user
    users.write().await.remove(&uid);
    let _ = session.close(None).await;
}

async fn broadcast_msg(
    msg: String,
    users: &Users,
    rooms: &Rooms,
    uid: usize,
    excluded_ids: Vec<usize>
) {
    let mut room_name: Option<String> = None;
    for (room_name_temp, room) in rooms.read().await.iter() {
        if room.contains(&uid) {
            room_name = Some(room_name_temp.clone());
            break;
        }
    }
    // if no room name was found, return
    if room_name.is_none() {
        return;
    }
    if let Some(room) = rooms.read().await.get(&room_name.unwrap()) {
        // send message to all users in the room, execpt those in the excluded_ids list
        for uid in room {
            if excluded_ids.contains(uid) {
                continue;
            }
            if let Some(tx) = users.read().await.get(uid) {
                tx.send(Message::Text(msg.clone().into())).expect("Failed to send message");
            }
        }
    }
}

async fn websocket(
    req: HttpRequest,
    body: web::Payload,
    app_state: web::Data<AppState>
) -> actix_web::Result<HttpResponse> {
    let app_state = app_state.into_inner();
    let (response, session, msg_stream) = actix_ws::handle(&req, body)?;

    // websocket state... used for sending connected and disconnected states
    let tx_ws_state = app_state.0.clone();
    let tx_ws_state2 = tx_ws_state.clone();

    // users state... used for keeping track of connected users
    let users_state = app_state.1.clone();
    let users_state2 = users_state.clone();

    // rooms state... used for keeping track of rooms and users in each room
    let rooms_state = app_state.2.clone();
    let rooms_state2 = rooms_state.clone();

    // send connected state
    if let Err(e) = tx_ws_state.send(WsState::Connected) {
        println!("Failed to send connected state: {e:?}");
    }

    // echo handler
    actix_web::rt::spawn(
        echo_handler(session, msg_stream, tx_ws_state2, users_state2, rooms_state2)
    );
    Ok(response)
}

// normal routes
#[derive(Serialize)]
struct MoveResponse {
    move_index: i8,
}

#[get("/")]
async fn hello() -> impl Responder {
    HttpResponse::Ok().body("Hello world!")
}

#[post("/echo")]
async fn echo(req_body: String) -> impl Responder {
    HttpResponse::Ok().body(req_body)
}

async fn manual_hello() -> impl Responder {
    HttpResponse::Ok().body("Hey there!")
}

#[get("/next_move/rule_based/{board_str}/{player}")] // <- define path parameters
async fn next_move_rule_based(
    path: web::Path<(String, IPlayer)>
) -> Result<web::Json<MoveResponse>, actix_web::Error> {
    let (board_str, player) = path.into_inner();
    let hash_map = create_code_char_hash(CODE_CHARS);
    let board: IBoard = board_from_string(&board_str, &hash_map);
    let agent = RuleAgent::new(player);
    let move_position: Option<IPosition> = agent.get_move(board);
    if move_position.is_none() {
        return Ok(
            web::Json({ MoveResponse {
                    move_index: -2,
                } })
        );
    }
    let move_index: i8 = piece_index_from_position(move_position.unwrap());
    let response = MoveResponse {
        move_index,
    };
    Ok(web::Json(response))
}
#[shuttle_runtime::main]
async fn actix_web() -> ShuttleActixWeb<impl FnOnce(&mut ServiceConfig) + Send + Clone + 'static> {
    // We're going to use channels to communicate between threads.
    // api state channel
    // websocket state channel
    let (tx_ws_state, mut rx_ws_state) = mpsc::unbounded_channel::<WsState>();

    // create a shared state for the client counter
    let client_count = Arc::new(AtomicUsize::new(0));
    let client_count2 = client_count.clone();

    // spawn a thread to continuously check the status of the websocket connections
    tokio::spawn(async move {
        while let Some(state) = rx_ws_state.recv().await {
            match state {
                WsState::Connected => {
                    println!("Client connected");
                    client_count2.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
                }
                WsState::Disconnected => {
                    println!("Client disconnected");
                    client_count2.fetch_sub(1, std::sync::atomic::Ordering::SeqCst);
                }
            }

            let client_count = client_count2.load(std::sync::atomic::Ordering::SeqCst);
        }
    });

    let users = Users::default();
    let rooms = Rooms::default();

    let app_state = web::Data::new((tx_ws_state, users, rooms));

    let config = move |cfg: &mut ServiceConfig| {
        let cors = Cors::default()
            .allowed_origin("http://localhost:3000")
            .allowed_origin("https://othelloverse.com")
            .allowed_origin("https://www.othelloverse.com")
            .allowed_methods(vec!["GET", "POST"]);
        cfg.service(
            web
                ::scope("/api")
                .wrap(cors)
                .service(web::resource("/ws").app_data(app_state).route(web::get().to(websocket)))
                .service(hello)
                .service(echo)
                .service(next_move_rule_based)
                .route("/hey", web::get().to(manual_hello))
                .wrap(middleware::NormalizePath::trim())
        );
    };
    Ok(config.into())
}
