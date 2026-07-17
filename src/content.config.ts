import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'zod';

const publications = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/publications" }),
    schema: z.object({
        title: z.string(),
        author: z.string().optional(),
        date: z.string().optional(),
        journal: z.string().optional(),
        external_url: z.string().optional(),
        image: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        hidden: z.boolean().optional(),
    }),
});

const talks = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/talks" }),
    schema: z.object({
        title: z.string(),
        date: z.string().optional(),
        event: z.string().optional(),
        external_url: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        hidden: z.boolean().optional(),
        image: z.string().optional(),
        image_width: z.string().optional(),
        image_height: z.string().optional(),
        image_position: z.enum(["left", "center", "right"]).optional(),
    }),
});

const posts = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
    schema: z.object({
        title: z.string(),
        date: z.string().optional(),
        description: z.string().optional(),
        author: z.string().optional(),
        tags: z.array(z.string()).optional(),
        external_url: z.string().optional(),
        image: z.string().optional(),
        hidden: z.boolean().optional(),
        image_width: z.string().optional(),
        image_height: z.string().optional(),
        image_position: z.enum(["left", "center", "right"]).optional(),
    }),
});

const teaching = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/teaching" }),
    schema: z.object({
        title: z.string(),
        institution: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        external_url: z.string().url().optional(),
        hidden: z.boolean().optional(),
    }),
});

const bio = defineCollection({
    loader: glob({ pattern: "bio.md", base: "./src/content" }),
    schema: z.object({
        name: z.string(),
        avatar: z.string(),
        shortBio: z.string().optional(),
        institution: z.string().optional(),
    }),
});

const projects = defineCollection({
    loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
    schema: z.object({
        title: z.string(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        external_url: z.string().optional(),
        image: z.string().optional(),
        hidden: z.boolean().optional(),
    }),
});

const cv = defineCollection({
    loader: glob({ pattern: "cv.md", base: "./src/content" }),
    schema: z.object({
        name: z.string(),
        title: z.string(),
        location: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        linkedin: z.string().optional(),
        github: z.string().optional(),
        nutshell: z.object({
            headline: z.string(),
            subtitle: z.string(),
        }).optional(),
        competencies: z.array(z.object({
            title: z.string(),
            summary: z.string(),
            tools: z.array(z.string()).optional(),
            extra: z.array(z.string()).optional(),
        })).optional(),
        experience: z.array(z.object({
            role: z.string(),
            institution: z.string(),
            period: z.string(),
            description: z.string(),
            location: z.string().optional(),
            bullets: z.array(z.string()).optional(),
            subBullets: z.array(z.string()).optional(),
        })).optional(),
        education: z.array(z.object({
            degree: z.string(),
            institution: z.string(),
            period: z.string(),
            location: z.string().optional(),
            thesis: z.string().optional(),
            description: z.string().optional(),
            role: z.string().optional(),
            details: z.array(z.string()).optional(),
            subDetails: z.array(z.string()).optional(),
            subEntries: z.array(z.object({
                title: z.string(),
                subtitle: z.string().optional(),
                period: z.string().optional(),
                location: z.string().optional(),
                description: z.string().optional(),
            })).optional(),
        })).optional(),
        languages: z.array(z.object({
            name: z.string(),
            level: z.string(),
        })).optional(),
        references: z.string().optional(),
        relocation: z.string().optional(),
    }),
});

const comments = defineCollection({
  loader: glob({
    pattern: "**/*.json",
    base: "./src/content/comments",
  }),

  schema: z
    .object({
      author: z
        .object({
          pseudonym: z.string(),
        })
        .passthrough(),

      comment: z
        .object({
          id: z.string(),
          ts_rcvd: z.string(),

          subject: z
            .object({
              path: z.string(),
            })
            .passthrough(),

          html: z.string(),
        })
        .passthrough(),

      email: z
        .object({
          date: z.string(),
        })
        .passthrough(),
    })
    .passthrough(),
});

export const collections = {
    'publications': publications,
    'talks': talks,
    'posts': posts,
    'bio': bio,
    'projects': projects,
    'cv': cv,
    'teaching': teaching,
    'comments': comments,
};
