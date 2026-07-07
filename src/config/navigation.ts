import type { NavLink } from "../types";

export const NAV_LINKS: NavLink[] = [
    { href: "/", label: "About", isActive: true },
    { href: "/publications", label: "Publications", isActive: false },
    { href: "/talks", label: "Talks", isActive: true },
    { href: "/teaching", label: "Projects", isActive: true },
    { href: "/posts", label: "Blog", isActive: true },
    { href: "/contact", label: "Contact Me", isActive: true },
    { href: "/tags", label: "Tags", isActive: false },
    { href: "/cv", label: "CV", isActive: true },
];
