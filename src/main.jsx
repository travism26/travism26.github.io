// Client entry: makes the pre-rendered page interactive.

import { hydrateRoot } from "react-dom/client";

import App from "./portfolio.jsx";

hydrateRoot(document.getElementById("root"), <App />);
