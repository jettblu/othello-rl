use actix_web::{ get, post, web, App, HttpResponse, HttpServer, Responder };
use serde::Deserialize;
use serde::Serialize;
// disable formatting for this line from code formatter
use othello_agent::agent::rule_based::RuleAgent;
use othello_agent::gameplay::types::{ IPlayer, IPosition };
use othello_agent::gameplay::utils::piece_index_from_position;
use othello_agent::gameplay::constants::{ INITIAL_BOARD };
use othello_agent::agent::traits::Agent;
use actix_cors::Cors;

#[derive(Deserialize)]
struct MoveRequest {
    board: String,
    player: i8,
}

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

#[get("/next_move/rule_based/{board}/{player}")] // <- define path parameters
async fn next_move_rule_based(
    path: web::Path<(String, IPlayer)>
) -> Result<web::Json<MoveResponse>, actix_web::Error> {
    let (board, player) = path.into_inner();
    let agent = RuleAgent::new(0);
    let move_position: Option<IPosition> = agent.get_move(INITIAL_BOARD);
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
    HttpServer::new(move || {
        App::new()
            .wrap(
                Cors::default()
                    .allowed_origin("http://localhost:3000")
                    .allowed_methods(vec!["GET", "POST"])
            )
            .service(hello)
            .service(echo)
            .service(next_move_rule_based)
            .route("/hey", web::get().to(manual_hello))
    })
        .bind(("127.0.0.1", 8080))?
        .run().await
}
