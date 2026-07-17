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
    // publications: {
    //     title: "Publications",
    //     subtitle: "A collection of research papers and scientific articles.",
    //     isActive: false,
    // },
    talks: {
        title: "Talks & Presentations",
        subtitle: "Presentations, public talks, colloquia, and media appearance.",
        isActive: true,
    },
    projects: {
        title: "Projects",
        subtitle: "Project Portfolio, Open source contributions, and technological experiments.",
        isActive: true,
    },
    contact: {
        title: "Let's catch up",
        subtitle: "Meet casually, or scroll down to reach out in formal ways.",
        isActive: true,
    },
    // teaching: {
    //     title: "Projects",
    //     subtitle: "Project Portfolio, Open source contributions, and technological experiments.",
    //     isActive: false,
    // },
    // tags: {
    //     title: "Tags",
    //     subtitle: "Explore content by topic.",
    //     isActive: false,
    // },
    cv: {
        title: "Curriculum Vitae",
        subtitle: "Professional experience and academic history.",
        isActive: true,
    },
};
