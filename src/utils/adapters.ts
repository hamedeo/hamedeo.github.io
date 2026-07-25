import type { ListingItem, DetailItem } from "../types";

function formatDate(dateValue: string | Date | undefined): string | undefined {
    if (!dateValue) return undefined;
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    if (isNaN(date.getTime())) return undefined;
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
}

function getContentImagePath(entry: any): string | undefined {
    const image = entry.data.image;
    if (!image) return undefined;
    if (/^(https?:)?\/\//.test(image) || image.startsWith("/")) return image;
    return `/src/content/${entry.collection}/${image}`;
}

export function getListingItem(entry: any, collection?: string): ListingItem {
    const d = entry.data;
    
    return {
        title: d.title,
        description: d.description,
        date: formatDate(d.date),
        authors: d.author,
        extraInput: d.journal || d.event || d.institution,
        tags: d.tags || [],
        externalUrl: d.external_url,
        image: getContentImagePath(entry),
        imageAlt: d.image_alt,
        imageWidth: d.image_width,
        imageHeight: d.image_height,
        imagePosition: d.image_position,
    };
}

export function getDetailItem(entry: any, collection: string): DetailItem {
    const listing = getListingItem(entry, collection);
    
    return {
        ...listing,
        backHref: collection === 'posts' ? '/posts' : `/${collection}`,
    };
}
