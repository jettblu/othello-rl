use actix_web::{ get, post, web, App, HttpResponse, HttpServer, Responder };
use serde::Deserialize;

#[derive(Deserialize)]
struct MoveRequest {
    board: String,
    player: i8,
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

#[post("/next_move/rule_based")]
async fn next_move_rule_based(req: web::Json<MoveRequest>) -> impl Responder {
    HttpResponse::Ok().body("Hey there!")
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    HttpServer::new(|| {
        App::new().service(hello).service(echo).route("/hey", web::get().to(manual_hello))
    })
        .bind(("127.0.0.1", 8080))?
        .run().await
}
