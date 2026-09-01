use actix_cors::Cors;
use actix_web::{
    get,
    middleware,
    post,
    web,
    App,
    HttpRequest,
    HttpResponse,
    HttpServer,
    Responder,
};
use actix_ws::Message;
use futures::StreamExt;
use std::{
    collections::HashMap,
    sync::{
        atomic::{AtomicUsize, Ordering},
        Arc,
    },
};
use tokio::sync::{
    mpsc::{self, UnboundedReceiver, UnboundedSender},
    RwLock,
};

type AppState = (mpsc::UnboundedSender<WsState>, Users, Rooms);

#[derive(Debug, Clone)]
enum WsState {
    Connected,
    Disconnected,
}

type Users = Arc<RwLock<HashMap<usize, UnboundedSender<Message>>>>;
type Rooms = Arc<RwLock<HashMap<String, Vec<usize>>>>;

static NEXT_USERID: AtomicUsize = AtomicUsize::new(1);

async fn echo_handler(
    mut session: actix_ws::Session,
    mut msg_stream: actix_ws::MessageStream,
    tx: mpsc::UnboundedSender<WsState>,
    users: Users,
    rooms: Rooms,
) {
    let uid = NEXT_USERID.fetch_add(1, Ordering::SeqCst);
    let (chat_tx, mut chat_rx): (UnboundedSender<Message>, UnboundedReceiver<Message>) =
        mpsc::unbounded_channel();
    users.write().await.insert(uid, chat_tx);
    let mut session_2 = session.clone();
    tokio::spawn(async move {
        while let Some(msg) = chat_rx.recv().await {
            let msg_txt = match msg {
                Message::Text(txt) => txt,
                _ => continue,
            };
            session_2
                .text(msg_txt)
                .await
                .expect("Failed to send message");
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
                let msg = s.trim();
                if msg.starts_with('/') {
                    let v: Vec<&str> = msg.splitn(2, ' ').collect();
                    match v[0] {
                        "/join" => {
                            if v.len() == 2 {
                                let room = v[1].to_owned();
                                leave_room(&rooms, uid).await;
                                let occupants = {
                                    let mut rooms_guard = rooms.write().await;
                                    let room_users =
                                        rooms_guard.entry(room.clone()).or_insert(Vec::new());
                                    if !room_users.contains(&uid) {
                                        room_users.push(uid);
                                    }
                                    room_users.len()
                                };
                                let seat = if occupants == 1 { "a" } else { "b" };
                                send_to_user(
                                    &users,
                                    uid,
                                    format!(
                                        r#"{{"type":"joined","seat":"{seat}","occupants":{occupants}}}"#
                                    ),
                                )
                                .await;
                                if occupants > 1 {
                                    broadcast_msg(
                                        r#"{"type":"peer_joined"}"#.to_string(),
                                        &users,
                                        &rooms,
                                        uid,
                                        vec![uid],
                                    )
                                    .await;
                                }
                            } else {
                                println!("Room name is required");
                            }
                        }
                        _ => {}
                    }
                } else {
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
    if let Some(room_name) = leave_room(&rooms, uid).await {
        broadcast_to_room(
            &users,
            &rooms,
            &room_name,
            r#"{"type":"peer_left"}"#.to_string(),
        )
        .await;
    }
    users.write().await.remove(&uid);
    let _ = session.close(None).await;
}

async fn leave_room(rooms: &Rooms, uid: usize) -> Option<String> {
    let mut rooms = rooms.write().await;
    let mut left = None;
    for (name, room_users) in rooms.iter_mut() {
        if room_users.contains(&uid) {
            room_users.retain(|&x| x != uid);
            left = Some(name.clone());
            break;
        }
    }
    left
}

async fn send_to_user(users: &Users, uid: usize, msg: String) {
    if let Some(tx) = users.read().await.get(&uid) {
        let _ = tx.send(Message::Text(msg.into()));
    }
}

async fn broadcast_to_room(users: &Users, rooms: &Rooms, room_name: &str, msg: String) {
    let room_users = {
        let rooms = rooms.read().await;
        rooms.get(room_name).cloned().unwrap_or_default()
    };
    let users = users.read().await;
    for user_id in room_users {
        if let Some(tx) = users.get(&user_id) {
            let _ = tx.send(Message::Text(msg.clone().into()));
        }
    }
}

async fn broadcast_msg(
    msg: String,
    users: &Users,
    rooms: &Rooms,
    uid: usize,
    excluded_ids: Vec<usize>,
) {
    let mut room_name: Option<String> = None;
    for (room_name_temp, room_users) in rooms.read().await.iter() {
        if room_users.contains(&uid) {
            room_name = Some(room_name_temp.clone());
            break;
        }
    }
    let Some(room_name) = room_name else {
        return;
    };
    if let Some(room_users) = rooms.read().await.get(&room_name) {
        for user_id in room_users {
            if excluded_ids.contains(user_id) {
                continue;
            }
            if let Some(tx) = users.read().await.get(user_id) {
                tx.send(Message::Text(msg.clone().into()))
                    .expect("Failed to send message");
            }
        }
    }
}

async fn websocket(
    req: HttpRequest,
    body: web::Payload,
    app_state: web::Data<AppState>,
) -> actix_web::Result<HttpResponse> {
    let app_state = app_state.into_inner();
    let (response, session, msg_stream) = actix_ws::handle(&req, body)?;

    let tx_ws_state = app_state.0.clone();
    let tx_ws_state2 = tx_ws_state.clone();
    let users_state2 = app_state.1.clone();
    let rooms_state2 = app_state.2.clone();

    if let Err(e) = tx_ws_state.send(WsState::Connected) {
        println!("Failed to send connected state: {e:?}");
    }

    actix_web::rt::spawn(echo_handler(
        session,
        msg_stream,
        tx_ws_state2,
        users_state2,
        rooms_state2,
    ));
    Ok(response)
}

#[get("/")]
async fn hello() -> impl Responder {
    HttpResponse::Ok().body("ok")
}

#[post("/echo")]
async fn echo(req_body: String) -> impl Responder {
    HttpResponse::Ok().body(req_body)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let port = std::env::var("PORT").unwrap_or_else(|_| "8001".to_string());
    let bind = format!("0.0.0.0:{port}");

    let (tx_ws_state, mut rx_ws_state) = mpsc::unbounded_channel::<WsState>();
    let client_count = Arc::new(AtomicUsize::new(0));
    let client_count2 = client_count.clone();

    tokio::spawn(async move {
        while let Some(state) = rx_ws_state.recv().await {
            match state {
                WsState::Connected => {
                    println!("Client connected");
                    client_count2.fetch_add(1, Ordering::SeqCst);
                }
                WsState::Disconnected => {
                    println!("Client disconnected");
                    client_count2.fetch_sub(1, Ordering::SeqCst);
                }
            }
        }
    });

    let users = Users::default();
    let rooms = Rooms::default();
    let app_state = web::Data::new((tx_ws_state, users, rooms));

    println!("Listening on {bind}");
    HttpServer::new(move || {
        let cors = Cors::default()
            .allowed_origin("http://localhost:3000")
            .allowed_origin("https://othelloverse.com")
            .allowed_origin("https://www.othelloverse.com")
            .allowed_methods(vec!["GET", "POST"])
            .allow_any_header();
        App::new().service(
            web::scope("/api")
                .wrap(cors)
                .wrap(middleware::NormalizePath::trim())
                .app_data(app_state.clone())
                .service(web::resource("/ws").route(web::get().to(websocket)))
                .service(hello)
                .service(echo),
        )
    })
    .bind(&bind)?
    .run()
    .await
}
