import type { SocialLink } from "../types";

export const SOCIALS: SocialLink[] = [
    {
        name: "Github",
        href: "https://github.com/hamedeo",
        linkTitle: `Deo Trovatore on Github`,
        isActive: true,
    },
    {
        name: "Mail",
        href: "mailto:deotrovatore@outlook.com",
        linkTitle: `Send an email to Deo Trovatore`,
        isActive: true,
    },
    {
        name: "LinkedIn",
        href: "https://www.linkedin.com/in/hamedeo",
        linkTitle: `Deo Trovatore on LinkedIn`,
        isActive: true,
    },
    {
        name: "WhatsApp",
        href: "https://api.whatsapp.com/send/?phone=31622410181",
        linkTitle: `Contact Deo Trovatore on WhatsApp`,
        isActive: true,
    },
    {
        name: "Cal",
        href: "https://cal.com/hamedeo",
        linkTitle: `Book a meeting with Deo Trovatore`,
        isActive: true,
    },
];

export const SOCIAL_ICONS: Record<string, string> = {
    Github: "Github",
    Mail: "Mail",
    LinkedIn: "LinkedIn",
    WhatsApp: "WhatsApp",
    Cal: "Calendar",
    RSS: "RSS",
};
