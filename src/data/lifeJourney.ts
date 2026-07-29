export const LIFE_VISUAL_STAGES = [
    "origins",
    "mechanical",
    "technology",
    "industrial",
    "movement",
    "thermofluid",
    "precision",
    "creation",
] as const;

export type LifeVisualStage = (typeof LIFE_VISUAL_STAGES)[number];

export type LifeMilestone = {
    id: string;
    year: string;
    place: string;
    title: string;
    sentence: string;
    visualStage: LifeVisualStage;
};

export const lifeJourney: LifeMilestone[] = [
    {
        id: "isfahan-origins",
        year: "Early years",
        place: "Isfahan, Iran",
        title: "Questions before answers",
        sentence:
            "Curiosity about motion, energy and how things work became the thread I would keep following.",
        visualStage: "origins",
    },
    {
        id: "mechanical-foundations",
        year: "2017",
        place: "Isfahan, Iran",
        title: "Engineering takes shape",
        sentence:
            "A mechanical engineering degree and fuel-cell cooling research gave that curiosity a rigorous technical structure.",
        visualStage: "mechanical",
    },
    {
        id: "technical-projects",
        year: "2015–2018",
        place: "Tehran & London",
        title: "Learning through delivery",
        sentence:
            "Building software and coordinating technical projects taught me to connect people, systems and practical outcomes.",
        visualStage: "technology",
    },
    {
        id: "energy-and-steel",
        year: "2017–2019",
        place: "Isfahan, Iran",
        title: "Working at industrial scale",
        sentence:
            "Energy systems and pressure-vessel work at Mobarakeh Steel turned analysis into decisions for large physical infrastructure.",
        visualStage: "industrial",
    },
    {
        id: "paris-energy",
        year: "2022",
        place: "Palaiseau, France",
        title: "A wider engineering horizon",
        sentence:
            "Studying sustainable transport energy at ENSTA Paris widened the scale and context of the systems I wanted to understand.",
        visualStage: "movement",
    },
    {
        id: "turin-masters",
        year: "2023",
        place: "Turin, Italy",
        title: "A second beginning",
        sentence:
            "Completing a master’s in mechanical engineering at Politecnico di Torino deepened both my technical range and independence.",
        visualStage: "movement",
    },
    {
        id: "eindhoven-research",
        year: "2023",
        place: "Eindhoven, Netherlands",
        title: "Following matter in motion",
        sentence:
            "At TU/e, I modelled molten-metal atomization, droplet cooling and solidification through computational thermo-fluids research.",
        visualStage: "thermofluid",
    },
    {
        id: "precision-engineering",
        year: "2023–2024",
        place: "Veldhoven, Netherlands",
        title: "Precision through coordination",
        sentence:
            "At ASML, complex hardware development showed me how tight tolerances depend on equally precise collaboration.",
        visualStage: "precision",
    },
    {
        id: "morpheidos",
        year: "2025 onward",
        place: "The Randstad, Netherlands",
        title: "Engineering independently",
        sentence:
            "I founded Morpheidos Tech to turn mechanical analysis and product-development knowledge into useful, grounded solutions.",
        visualStage: "creation",
    },
    {
        id: "digital-society-school",
        year: "2026",
        place: "Amsterdam, Netherlands",
        title: "Creation is collaborative",
        sentence:
            "Leading a multidisciplinary Digital Society School team strengthened the human, communicative side of making.",
        visualStage: "creation",
    },
    {
        id: "current-direction",
        year: "Now",
        place: "Netherlands",
        title: "Building what moves",
        sentence:
            "Engineering, reflection and independent creation now converge in a practice that remains stable enough to grow and open enough to change.",
        visualStage: "creation",
    },
];
