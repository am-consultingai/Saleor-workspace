import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { Deck } from "./deck-kit/engine/Deck";
import { slides } from "./presentation/slides";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Deck slides={slides} />
  </StrictMode>,
);
