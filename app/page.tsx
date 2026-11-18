import HomeContent from "./HomeContent";

// 首页必须是静态 ISR：这样其他页面点击「首页」时能命中预取/缓存，
// 而不是像以前那样因为读取 searchParams 而变成动态渲染。
export const revalidate = 60;

export default function Home() {
  return <HomeContent page={1} />;
}
