import { lazy, Suspense } from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
const App = lazy(() => import('@renderer/pages/App'))
const Workflow = lazy(() => import('@renderer/pages/Workflow'))
const Skills = lazy(() => import('@renderer/pages/Skills'))
const Chat = lazy(() => import('@renderer/pages/Chat'))
const Settings = lazy(() => import('@renderer/pages/Settings'))
const Agents = lazy(() => import('@renderer/pages/Agents'))

export interface RouteType {
    index?: boolean
    path?: string
    element: React.ReactNode,
    children?: RouteType[],
    meta: {
        title: string,
        icon?: React.ReactNode,
        permission: string[],
    }
}
const router = createBrowserRouter([
    {
        path: "/",
        element: <App />,
        children: [
            {
                index: true,
                element: <Workflow />,
            },
            {
                path: "skills",
                element: <Skills />,
            },
            {
                path: "settings",
                element: <Settings />,
            },
            {
                path: "agents",
                element: <Agents />,
            },
            {
                path: "chat",
                element: <Chat />,
            },
            {
                path: "404",
                element: <h1>404, 页面不存在</h1>,
            },
        ]
    },
]);
export default function MainRouter(): React.JSX.Element {

    return (
        <Suspense fallback={(
            <div
                style={{ width: "100%", height: '100%', alignItems: "center", justifyContent: "center" }}
            >
                加载中...
            </div>
        )}>
            <RouterProvider router={router} />
        </Suspense>
    )
}
