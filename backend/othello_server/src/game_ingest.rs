use std::{
    collections::HashMap,
    time::{Duration, Instant},
};

use actix_web::{post, web, HttpMessage, HttpRequest, HttpResponse, Responder};
use aws_sdk_s3::{primitives::ByteStream, Client};
use othello_agent::gameplay::validate::validate_game_record;
use serde::Deserialize;
use tokio::sync::Mutex;

pub const MAX_BODY_BYTES: usize = 4096;
const PER_MINUTE: usize = 6;
const PER_HOUR: usize = 60;
const CLEANUP_INTERVAL: usize = 256;
const MAX_THINK_MS: u32 = 3_600_000;

#[derive(Debug, Deserialize)]
struct GameRecordIn {
    v: u8,
    id: String,
    m: u8,
    g: String,
    s: [u16; 2],
    w: u8,
    a: [u8; 2],
    t: Option<Vec<u32>>,
}

#[derive(Default)]
pub struct RateLimiter {
    hits: HashMap<String, Vec<Instant>>,
    requests_since_cleanup: usize,
}

impl RateLimiter {
    fn allow(&mut self, key: &str) -> bool {
        let now = Instant::now();
        let hour = Duration::from_secs(3600);
        let minute = Duration::from_secs(60);
        self.requests_since_cleanup += 1;
        if self.requests_since_cleanup >= CLEANUP_INTERVAL {
            self.hits.retain(|_, entries| {
                entries.retain(|t| now.duration_since(*t) < hour);
                !entries.is_empty()
            });
            self.requests_since_cleanup = 0;
        }
        let entries = self.hits.entry(key.to_string()).or_default();
        entries.retain(|t| now.duration_since(*t) < hour);
        let last_minute = entries
            .iter()
            .filter(|t| now.duration_since(**t) < minute)
            .count();
        if last_minute >= PER_MINUTE || entries.len() >= PER_HOUR {
            return false;
        }
        entries.push(now);
        true
    }
}

pub struct IngestState {
    pub s3: Option<Client>,
    pub bucket: Option<String>,
    pub rate: Mutex<RateLimiter>,
}

fn client_ip(req: &HttpRequest) -> String {
    if std::env::var_os("FLY_APP_NAME").is_some() {
        return req
            .headers()
            .get("fly-client-ip")
            .and_then(|v| v.to_str().ok())
            .unwrap_or("unknown")
            .to_string();
    }
    req.peer_addr()
        .map(|address| address.ip().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

fn origin_allowed(req: &HttpRequest) -> bool {
    let Some(origin) = req.headers().get("origin") else {
        return false;
    };
    let Ok(origin) = origin.to_str() else {
        return false;
    };
    matches!(
        origin,
        "http://localhost:3000" | "https://othelloverse.com" | "https://www.othelloverse.com"
    )
}

fn validate_payload(body: &GameRecordIn) -> bool {
    if body.v != 1 {
        return false;
    }
    if !is_uuid_v4(&body.id) {
        return false;
    }
    if body.m > 3 {
        return false;
    }
    if body.a[0] > 2 || body.a[1] > 2 {
        return false;
    }
    if let Some(t) = &body.t {
        let ply = body.g.len() / 2;
        if t.len() != ply || t.iter().any(|&ms| ms > MAX_THINK_MS) {
            return false;
        }
    }
    validate_game_record(&body.g, body.s, body.w)
}

#[post("/games")]
pub async fn post_game(
    req: HttpRequest,
    body: web::Bytes,
    state: web::Data<IngestState>,
) -> impl Responder {
    if !origin_allowed(&req) {
        return HttpResponse::Forbidden().finish();
    }

    if req.content_type() != "application/json" {
        return HttpResponse::UnsupportedMediaType().finish();
    }

    {
        let mut rate = state.rate.lock().await;
        if !rate.allow(&client_ip(&req)) {
            return HttpResponse::TooManyRequests().finish();
        }
    }

    let parsed: GameRecordIn = match serde_json::from_slice(&body) {
        Ok(v) => v,
        Err(_) => return HttpResponse::BadRequest().finish(),
    };

    if !validate_payload(&parsed) {
        return HttpResponse::BadRequest().finish();
    }

    let (Some(client), Some(bucket)) = (state.s3.as_ref(), state.bucket.as_deref()) else {
        return HttpResponse::ServiceUnavailable().finish();
    };

    let ts = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let key = format!("games/{}.json", parsed.id);

    let stored = serde_json::json!({
        "v": parsed.v,
        "id": parsed.id,
        "ts": ts,
        "m": parsed.m,
        "g": parsed.g,
        "s": parsed.s,
        "w": parsed.w,
        "a": parsed.a,
        "t": parsed.t,
    });

    let bytes = match serde_json::to_vec(&stored) {
        Ok(b) => b,
        Err(_) => return HttpResponse::InternalServerError().finish(),
    };

    if client
        .put_object()
        .bucket(bucket)
        .key(&key)
        .body(ByteStream::from(bytes))
        .content_type("application/json")
        .send()
        .await
        .is_err()
    {
        return HttpResponse::InternalServerError().finish();
    }

    HttpResponse::NoContent().finish()
}

fn is_uuid_v4(id: &str) -> bool {
    id.len() == 36
        && id.bytes().enumerate().all(|(index, byte)| match index {
            8 | 13 | 18 | 23 => byte == b'-',
            14 => byte == b'4',
            _ => byte.is_ascii_hexdigit(),
        })
}
