import "./styles.css";
import "./ui/app.ts";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void navigator.serviceWorker.register("/sw.js");
}
