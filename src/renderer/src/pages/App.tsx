import ClickSqark from "@renderer/components/ClickSqark";
import Layout from "@renderer/components/Layout";
import { Outlet } from "react-router-dom";
import '@renderer/assets/react-flow-custom.css';
import '@renderer/assets/iconfont.css';

export default function App() :React.JSX.Element{
    return (
        <Layout>
            <ClickSqark />
            <Outlet />
        </Layout>
    )
}
