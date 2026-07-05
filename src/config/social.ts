import type { SocialLink } from "../types";

export const SOCIALS: SocialLink[] = [
    {
        name: "Github",
        href: "https://github.com/hamedeo",
        linkTitle: `Hamed Abdollahi on Github`,
        isActive: true,
    },
    {
        name: "Mail",
        href: "mailto:hamed.abdollahi@outlook.com",
        linkTitle: `Send an email to Hamed Abdollahi`,
        isActive: true,
    },
    {
        name: "LinkedIn",
        href: "https://www.linkedin.com/in/hamedeo",
        linkTitle: `Hamed Abdollahi on LinkedIn`,
        isActive: true,
    },
    {
        name: "WhatsApp",
        href: "https://api.whatsapp.com/send/?phone=31622410181",
        linkTitle: `Contact Hamed Abdollahi on WhatsApp`,
        isActive: true,
    },
    {
        name: "Cal",
        href: "https://cal.eu/hamedeo",
        linkTitle: `Book a meeting with Hamed Abdollahi`,
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
