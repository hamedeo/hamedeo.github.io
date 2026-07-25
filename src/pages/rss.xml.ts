import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { SITE, PAGES } from "../config";

export async function GET(context: any) {
    const posts = PAGES.blog.isActive !== false
        ? (await getCollection("posts")).filter((post: any) => post.data.hidden !== true)
        : [];
    const publications = PAGES.publications.isActive !== false
        ? (await getCollection("publications")).filter((publication: any) => publication.data.hidden !== true)
        : [];
    const talks = PAGES.talks.isActive !== false
        ? (await getCollection("talks")).filter((talk: any) => talk.data.hidden !== true)
        : [];
    const projects = PAGES.projects.isActive !== false
        ? (await getCollection("projects")).filter((project: any) => project.data.hidden !== true)
        : [];

    const items = [
        ...posts.map((post: any) => ({
            title: post.data.title,
            pubDate: post.data.date ? new Date(post.data.date) : undefined,
            description: post.data.description,
            link: `/posts/${post.id}/`,
            categories: post.data.tags,
        })),
        ...publications.map((pub: any) => ({
            title: `[Publication] ${pub.data.title}`,
            pubDate: pub.data.date ? new Date(pub.data.date) : undefined,
            description: pub.data.description || `Published in ${pub.data.journal || 'Journal'}`,
            link: `/publications/${pub.id}/`,
            categories: pub.data.tags,
        })),
        ...talks.map((talk: any) => ({
            title: `[Talk] ${talk.data.title}`,
            pubDate: talk.data.date ? new Date(talk.data.date) : undefined,
            description: talk.data.description || `Presented at ${talk.data.event || "an event"}`,
            link: `/talks/${talk.id}/`,
            categories: talk.data.tags,
        })),
        ...projects.map((project: any) => ({
            title: `[Project] ${project.data.title}`,
            pubDate: project.data.date ? new Date(project.data.date) : undefined,
            description: project.data.description,
            link: `/projects/${project.id}/`,
            categories: project.data.tags,
        })),
    ].sort((a, b) => (b.pubDate?.getTime() || 0) - (a.pubDate?.getTime() || 0));

    return rss({
        title: SITE.title,
        description: SITE.desc,
        site: context.site || SITE.website,
        xmlns: {
            dc: "http://purl.org/dc/elements/1.1/",
        },
        customData: `<language>${SITE.lang}</language><dc:creator>${SITE.author}</dc:creator>`,
        items,
    });
}
