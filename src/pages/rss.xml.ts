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

    const items = [
        ...posts.map((post: any) => ({
            title: post.data.title,
            pubDate: post.data.date,
            description: post.data.description,
            link: `/posts/${post.id}/`,
        })),
        ...publications.map((pub: any) => ({
            title: `[Publication] ${pub.data.title}`,
            pubDate: pub.data.date,
            description: pub.data.description || `Published in ${pub.data.journal || 'Journal'}`,
            link: `/publications/${pub.id}/`,
        })),
    ].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

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
