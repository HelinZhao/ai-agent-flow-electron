/* 火花点击动画 */
import { useEventListener } from 'ahooks';
import styles from './style.module.less'
import { useRef, useState } from 'react';

export default function ClickSpark(): React.JSX.Element {
    const svgRef = useRef<SVGSVGElement>(null)
    const [position, setPosition] = useState({ left: 0, top: 0 })

    const animateSpark = (): void => {
        const sparks = svgRef.current?.children;
        if (!sparks) return
        const size = parseInt(sparks[0].getAttribute("y1") as string);
        const offset = size / 2 + "px";
        const keyframes = (i: number): { strokeDashoffset: number, transform: string }[] => {
            const deg = `calc(${i} * (360deg / ${sparks!.length}))`;
            return [
                {
                    strokeDashoffset: size * 3,
                    transform: `rotate(${deg}) translateY(${offset})`
                },
                {
                    strokeDashoffset: size,
                    transform: `rotate(${deg}) translateY(0)`
                }
            ];
        };

        for (let i = 0; i < sparks.length; i++) {
            sparks.item(i)!.animate(keyframes(i), {
                duration: 660,
                easing: "cubic-bezier(0.25, 1, 0.5, 1)",
                fill: "forwards"
            })
        }
    }

    useEventListener('click', (e) => {
        const rect = document.documentElement.getBoundingClientRect();
        const clientWidth = svgRef.current?.clientWidth || 0
        const clientHeight = svgRef.current?.clientHeight || 0
        setPosition({
            left: e.clientX - rect.left - clientWidth / 2,
            top: e.clientY - rect.top - clientHeight / 2
        })
        animateSpark()
    });

    return (
        <span className={styles.click_sqark}>
            <svg
                ref={svgRef}
                width="30" height="30"
                viewBox="0 0 100 100"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="4"
                style={{ ...position }}
            >
                <line x1="50" y1="30" x2="50" y2="4" />
                <line x1="50" y1="30" x2="50" y2="4" />
                <line x1="50" y1="30" x2="50" y2="4" />
                <line x1="50" y1="30" x2="50" y2="4" />
                <line x1="50" y1="30" x2="50" y2="4" />
                <line x1="50" y1="30" x2="50" y2="4" />
                <line x1="50" y1="30" x2="50" y2="4" />
                <line x1="50" y1="30" x2="50" y2="4" />
            </svg>
        </span>
    )
}
