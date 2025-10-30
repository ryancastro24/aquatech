import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import LoginPage from "@/pages/LoginPage";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import Dashboard from "@/pages/Dashboard";
import DashboardMain from "./DashboardPages/DashboardMain";
import Stores from "./DashboardPages/Stores";
import Purchases from "./DashboardPages/Purchases";
import Sales from "./DashboardPages/Sales";
import Inventory from "./DashboardPages/Inventory";
import OrderInStores from "./DashboardPages/OrderInStores";
import CreateOwnersAccount from "./DashboardPages/CreateOwnersAccount";
import MyStorePage from "./DashboardPages/MyStorePage";
import StoreBranch from "./DashboardPages/StoreBranch";
import DeliveryAgentManagement from "./DashboardPages/DeliveryAgentManagement";
import DeliveryTeamPage from "./DashboardPages/DeliveryTeamPage";
import PublicRoute from "./components/ui/PublicRoutes";
import ProtectedRoute from "./components/ProtectedRoutes";
import CustomerOrderHistory from "./DashboardPages/CustomerOrderHistory";
import AdsManagemet from "./DashboardPages/AdsManagemet";
import StoreDetails, {
  loader as storeDetailsLoader,
} from "./DashboardPages/StoreDetails";
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },

  {
    path: "/dashboard",
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "dashboard_main",
        element: <DashboardMain />,
      },
      {
        path: "ads_management",
        element: <AdsManagemet />,
      },
      {
        path: "stores",
        element: <Stores />,
      },

      {
        path: "order_in_stores/:storeId",
        element: <OrderInStores />,
      },

      {
        path: "customerorderhistory",
        element: <CustomerOrderHistory />,
      },

      {
        path: "purchases",
        element: <Purchases />,
      },

      {
        path: "sales",
        element: <Sales />,
      },
      {
        path: "inventory",
        element: <Inventory />,
      },

      {
        path: "create_business_owner_account",
        element: <CreateOwnersAccount />,
      },

      {
        path: "storebranches/:branchId",
        element: <StoreBranch />,
      },

      {
        path: "mystorepage",
        element: <MyStorePage />,
      },

      {
        path: "delivery_agent_management",
        element: <DeliveryAgentManagement />,
      },

      {
        path: "delivery_team_management",
        element: <DeliveryTeamPage />,
      },

      {
        path: "store/:storeId",
        element: <StoreDetails />,
        loader: storeDetailsLoader,
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>
);
