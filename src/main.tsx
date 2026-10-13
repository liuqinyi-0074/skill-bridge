import { APP_CONFIG } from "./config/runtime";
import "./styles/index.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from 'virtual:pwa-register';
import App from "./App";
import { store, persistor } from "./store";
import { registerDefaultSummaryBuilders } from "./summary/defaultBuilders";
import { registerAbilityCountsBuilder } from "./summary/abilityBuilder";
import { registerJobSummaryBuilder } from "./summary/jobBuilder";
import { initSentry } from "./sentry";
initSentry(); 
registerDefaultSummaryBuilders();
registerAbilityCountsBuilder();
registerJobSummaryBuilder();
if (APP_CONFIG.pwaEnabled) registerSW({
  // Called when a new SW is available; we ask it to apply immediately.
  onNeedRefresh() { /* You could show a toast; plugin can auto-update */ },
  onOfflineReady() { /* App shell is cached for offline usage */ }
});
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      networkMode: "always",
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate persistor={persistor} loading={null}>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </PersistGate>
    </Provider>
  </React.StrictMode>,
);
