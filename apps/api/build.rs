// Garante que o `sqlx::migrate!()` seja recompilado quando novas migrations
// forem adicionadas em `infra/migrations` (o macro embute os arquivos no binário).
fn main() {
    println!("cargo:rerun-if-changed=../../infra/migrations");
}
