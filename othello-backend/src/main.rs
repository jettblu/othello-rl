use std::sync::atomic::AtomicUsize;
use std::sync::Arc;
use std::time::Instant;

use actix::{Actor, Addr};
use actix_web::{ Error, HttpRequest };
use actix_web::{ get, post, web, App, HttpResponse, HttpServer, Responder };
use actix_web_actors::ws;
use othello_agent::gameplay::constants::CODE_CHARS;
use othello_agent::gameplay::encoding::board_from_string;
use othello_agent::gameplay::encoding::create_code_char_hash;
use othello_agent::gameplay::types::IBoard;
use realtime::{ server, session };
use serde::Serialize;
// disable formatting for this line from code formatter
use othello_agent::agent::rule_based::RuleAgent;
use othello_agent::gameplay::types::{ IPlayer, IPosition };
use othello_agent::gameplay::utils::piece_index_from_position;
use othello_agent::agent::traits::Agent;
use actix_cors::Cors;

mod realtime;

#[derive(Serialize)]
struct MoveResponse {
    move_index: i8,
}

#[get("/")]
async fn hello() -> impl Responder {
    println!("Here!");
    HttpResponse::Ok().body("Hello world!")
}

#[post("/echo")]
async fn echo(req_body: String) -> impl Responder {
    HttpResponse::Ok().body(req_body)
}

async fn manual_hello() -> impl Responder {
    HttpResponse::Ok().body("Hey there!")
}

/// Entry point for our websocket route
async fn chat_route(
    req: HttpRequest,
    stream: web::Payload,
    srv: web::Data<Addr<server::ChatServer>>
) -> Result<HttpResponse, Error> {
    println!("chat_route");
    ws::start(
        session::WsChatSession {
            id: 0,
            hb: Instant::now(),
            room: "main".to_owned(),
            name: None,
            addr: srv.get_ref().clone(),
        },
        &req,
        stream
    )
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

#[actix_web::main]
async fn main() -> std::io::Result<()> {
        // set up applications state
    // keep a count of the number of visitors
    let app_state = Arc::new(AtomicUsize::new(0));

    println!("Starting server...");
    // start chat server actor
    let server = server::ChatServer::new(app_state.clone()).start();
    println!("Chat server started");
    HttpServer::new(move || {
        App::new()
            .wrap(
                Cors::default()
                    .allowed_origin("http://localhost:3000")
                    .allowed_methods(vec!["GET", "POST",])
            )
            .service(hello)
            .service(echo)
            .service(next_move_rule_based)
            .app_data(web::Data::from(app_state.clone()))
            .app_data(web::Data::new(server.clone()))
            .route("/ws", web::get().to(chat_route))
            .route("/hey", web::get().to(manual_hello))
    })
        .bind(("127.0.0.1", 8080))?
        .run().await
}
