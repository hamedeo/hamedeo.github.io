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
        isActive: true,
    },
    publications: {
        title: "Publications",
        subtitle: "A collection of research papers and scientific articles.",
        isActive: false,
    },
    talks: {
        title: "Talks & Presentations",
        subtitle: "Presentations, public lectures, colloquia, and media appearance.",
        isActive: true,
    },
    projects: {
        title: "Contact Information",
        subtitle: "Ways to connect, discuss a project, or just grab a coffee.",
        isActive: true,
    },
    teaching: {
        title: "Projects",
        subtitle: "Project Portfolio, Open source contributions, and technological experiments.",
        isActive: true,
    },
    tags: {
        title: "Tags",
        subtitle: "Explore content by topic.",
        isActive: false,
    },
    cv: {
        title: "Curriculum Vitae",
        subtitle: "Professional and academic history.",
        isActive: true,
    },
};
