import { lazy, Suspense } from "react";
import { createHashRouter, RouterProvider } from "react-router-dom";
const App = lazy(() => import('@renderer/pages/App'))

const router = createHashRouter([
    {
        path: "/",
        element: <App />,
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