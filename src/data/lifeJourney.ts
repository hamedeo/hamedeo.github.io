export const LIFE_VISUAL_STAGES = [
    "it",
    "mechanical-consulting",
    "masters",
    "research",
    "asml",
    "morpheidos",
    "dss",
    "kaleidocycle",
    "liminal",
] as const;

export type LifeVisualStage = (typeof LIFE_VISUAL_STAGES)[number];

export type LifeLogoId =
    | "msc"
    | "azg"
    | "polito"
    | "tue"
    | "asml"
    | "morpheidos"
    | "dss";

export type LifeJourneyStage = {
    id: string;
    period: string;
    place?: string;
    title: string;
    description: string;
    visualStage: LifeVisualStage;
    logoIds?: LifeLogoId[];
};

export const lifeJourney: LifeJourneyStage[] = [
    {
        id: "it-projects",
        period: "2015–2018",
        place: "Tehran & London",
        title: "More than three years delivering projects",
        description:
            "I worked with clients to develop and deliver solutions, learning how technical ideas become coordinated outcomes. Programming became a practical tool as I prepared to become a mechanical engineer.",
        visualStage: "it",
    },
    {
        id: "pressure-vessel",
        period: "2018–2019",
        place: "Isfahan, Iran",
        title: "Mechanical design at industrial scale",
        description:
            "At AurangZib Gita Co., I supported pressure-vessel development for major steel manufacturing, translating engineering analysis into a delivered industrial system.",
        visualStage: "mechanical-consulting",
        logoIds: ["msc", "azg"],
    },
    {
        id: "masters-italy",
        period: "2023",
        place: "Turin, Italy",
        title: "Deepening my technical capabilities",
        description:
            "Following project delivery, I completed a master’s degree in mechanical engineering at Politecnico di Torino.",
        visualStage: "masters",
        logoIds: ["polito"],
    },
    {
        id: "thermofluid-research",
        period: "2023",
        place: "Eindhoven, Netherlands",
        title: "Researching droplets in motion",
        description:
            "At Eindhoven University of Technology (TU/e), I completed advanced thermo-fluid research for additive manufacturing.",
        visualStage: "research",
        logoIds: ["tue"],
    },
    {
        id: "asml",
        period: "2023–2024",
        place: "Veldhoven, Netherlands",
        title: "Precision depends on collaboration",
        description:
            "At ASML, I learned that mastering extreme technical complexity depends on cross-border collaboration and a united team spirit.",
        visualStage: "asml",
        logoIds: ["asml"],
    },
    {
        id: "morpheidos-tech",
        period: "2025 onward",
        place: "The Randstad, Netherlands",
        title: "Turning knowledge into solutions",
        description:
            "A year later, I founded Morpheidos Tech to turn technical know-how into useful, impactful engineering solutions.",
        visualStage: "morpheidos",
        logoIds: ["morpheidos"],
    },
    {
        id: "digital-society-school",
        period: "2026",
        place: "Amsterdam, Netherlands",
        title: "Developing the human side of making",
        description:
            "Realizing that execution without reflection is incomplete, I joined the Digital Society School at AUAS to push my teamwork, communication and leadership skills past beyond my comfort zone.",
        visualStage: "dss",
        logoIds: ["dss"],
    },
    {
        id: "kaleidocycle",
        period: "Ongoing",
        place: "Netherlands",
        title: "Creation as a discipline of change",
        description:
            "A personal exploration of balanced motion in space, response to change and a willingness to be transformed by what we build.",
        visualStage: "kaleidocycle",
    },
    {
        id: "liminal",
        period: "Now",
        place: "Netherlands",
        title: "Embracing the process of finding",
        description:
            "I am in a liminal state—moving toward my next role and assignment, open to being transformed by what I choose to build next.",
        visualStage: "liminal",
    },
];
