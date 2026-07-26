const CLASS_DIRECTIVE = "class:";
const ALLOWED_CLASSES = new Set([
    "article-image",
    "article-image--half",
    "article-image--full",
]);

export default function rehypeImageClasses() {
    return function transform(tree) {
        const visit = (node) => {
            if (
                node?.type === "element" &&
                node.tagName === "img" &&
                typeof node.properties?.title === "string" &&
                node.properties.title.startsWith(CLASS_DIRECTIVE)
            ) {
                const requestedClasses = node.properties.title
                    .slice(CLASS_DIRECTIVE.length)
                    .trim()
                    .split(/\s+/)
                    .filter((className) => ALLOWED_CLASSES.has(className));

                if (requestedClasses.length > 0) {
                    const existingClasses = Array.isArray(node.properties.className)
                        ? node.properties.className
                        : [];
                    node.properties.className = [
                        ...new Set([...existingClasses, ...requestedClasses]),
                    ];
                    delete node.properties.title;
                }
            }

            if (Array.isArray(node?.children)) {
                node.children.forEach(visit);
            }
        };

        visit(tree);
    };
}
