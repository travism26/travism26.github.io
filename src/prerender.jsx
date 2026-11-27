// Build-time entry: renders the application to the HTML that is placed inside
// the page's root element. The client entry hydrates that markup.

import { renderToString } from "react-dom/server";

import App from "./portfolio.jsx";

export function render() {
  return renderToString(<App />);
}
