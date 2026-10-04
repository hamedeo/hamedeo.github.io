import type { PagesConfig } from "../types";

export const PAGES: PagesConfig = {
    home: {
        title: "About Me",
        subtitle: "",
        isActive: true,
    },
    blog: {
        title: "Blog",
        subtitle: "Thoughts & Action.",
        isActive: false,
    },
    publications: {
        title: "Publications",
        subtitle: "A collection of research papers and scientific articles.",
        isActive: false,
    },
    talks: {
        title: "Talks & Presentations",
        subtitle: "Presentations, public talks, colloquia, and media appearance.",
        isActive: true,
    },
    projects: {
        title: "Projects",
        subtitle: "Project Portfolio, Open source contributions, and technological experiments.",
        isActive: false,
    },
    contact: {
        title: "Let's catch up",
        subtitle: "Choose Your Way to Connect.",
        isActive: true,
    },
    teaching: {
        title: "Projects",
        subtitle: "Project Portfolio, Open source contributions, and technological experiments.",
        isActive: false,
    },
    tags: {
        title: "Tags",
        subtitle: "Explore content by topic.",
        isActive: false,
    },
    cv: {
        title: "Curriculum Vitae",
        subtitle: "Professional experience and academic history.",
        isActive: true,
    },
};
