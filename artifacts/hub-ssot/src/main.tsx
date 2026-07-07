import { createRoot } from "react-dom/client";
import App from "./App";
import "@telefonica/mistica/css/mistica.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
