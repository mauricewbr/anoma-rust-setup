use axum::{
    extract::Json,
    http::StatusCode,
    response::{Html, IntoResponse},
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tower::ServiceBuilder;
use tower_http::services::ServeDir;

#[derive(Deserialize)]
struct ExecuteRequest {
    // Add any parameters your function needs here
}

#[derive(Serialize)]
struct ExecuteResponse {
    result: String,
}

#[derive(Serialize)]
struct ErrorResponse {
    error: String,
}

async fn serve_index() -> Html<String> {
    let html = tokio::fs::read_to_string("static/index.html")
        .await
        .unwrap_or_else(|_| {
            r#"
            <!DOCTYPE html>
            <html><head><title>Error</title></head>
            <body><h1>Could not load index.html</h1><p>Make sure static/index.html exists</p></body>
            </html>
            "#.to_string()
        });
    Html(html)
}

async fn execute_function(
    Json(payload): Json<ExecuteRequest>,
) -> Result<Json<ExecuteResponse>, (StatusCode, Json<ErrorResponse>)> {
    // This is where you put your server-side function logic
    // For now, it's just a demo function
    match demo_server_function().await {
        Ok(result) => Ok(Json(ExecuteResponse { result })),
        Err(e) => Err((
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(ErrorResponse {
                error: format!("Function execution failed: {}", e),
            }),
        )),
    }
}

async fn demo_server_function() -> Result<String, Box<dyn std::error::Error>> {
    // Replace this with your actual server-side logic
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await; // Simulate work
    
    let mut result = String::new();
    result.push_str("Server function executed successfully!\n\n");
    result.push_str(&format!("Timestamp: {}\n", chrono::Utc::now().format("%Y-%m-%d %H:%M:%S UTC")));
    result.push_str("Server info:\n");
    result.push_str(&format!("- OS: {}\n", std::env::consts::OS));
    result.push_str(&format!("- Architecture: {}\n", std::env::consts::ARCH));
    result.push_str(&format!("- Available parallelism: {:?}\n", std::thread::available_parallelism()));
    
    // Add some sample data processing
    let numbers: Vec<i32> = (1..=10).collect();
    let sum: i32 = numbers.iter().sum();
    let average = sum as f64 / numbers.len() as f64;
    
    result.push_str("\nSample calculation:\n");
    result.push_str(&format!("- Numbers: {:?}\n", numbers));
    result.push_str(&format!("- Sum: {}\n", sum));
    result.push_str(&format!("- Average: {:.2}\n", average));
    
    Ok(result)
}

#[tokio::main]
async fn main() {
    let app = Router::new()
        .route("/", get(serve_index))
        .route("/execute", post(execute_function))
        .nest_service("/static", ServeDir::new("static"));

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    
    println!("🚀 Server running at http://127.0.0.1:3000");
    println!("📁 Serving static files from ./static/");
    
    axum::serve(listener, app).await.unwrap();
}
