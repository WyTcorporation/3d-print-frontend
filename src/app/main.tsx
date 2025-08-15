import React from "react";
import ReactDOM from "react-dom/client";
import {BrowserRouter} from "react-router-dom";
import App from "./App";
import "../../styles/index.css";
import {LocaleProvider} from "@/shared/i18n/LocaleContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <BrowserRouter>
            <LocaleProvider>
                <App/>
            </LocaleProvider>
        </BrowserRouter>
    </React.StrictMode>
);
