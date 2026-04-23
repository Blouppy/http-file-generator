export type Language = "en" | "fr";

export const translations = {
  en: {
    // Language toggle
    toggleLanguage: "Toggle language",
    languageEnglish: "English",
    languageFrench: "French",

    // Theme toggle
    toggleTheme: "Toggle theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",

    // Step indicators
    stepUpload: "1. Upload",
    stepSelect: "2. Select",
    stepGenerate: "3. Generate",

    // Upload page
    uploadTitle: "Upload your OpenAPI spec",
    uploadDescription: "Drop or browse to upload a .json, .yaml, or .yml file.",

    // File upload zone
    dropzone: "Drop your OpenAPI spec here",
    dropzoneFormats: "Supports .json, .yaml, and .yml files",
    dropzoneParsing: "Parsing...",
    dropzoneBrowse: "Browse files",
    dropzoneTryAgain: "Try again",
    dropzoneParseError: "Failed to parse OpenAPI spec",

    // Spec info
    specVersion: "Version",
    specBaseUrl: "Base URL",
    specEndpointCount: (n: number) => `${n} endpoint${n !== 1 ? "s" : ""}`,
    specSelectedCount: (n: number) => `${n} selected`,
    specSelectAll: "Select All",
    specDeselectAll: "Deselect All",
    specUploadNew: "Upload new file",

    // Endpoint group
    endpointsTitle: "Endpoints",
    groupAll: "All",
    groupNone: "None",

    // Endpoint filters
    filterSearchPlaceholder: "Search endpoints by path, summary…",
    filterMethodLabel: "Method",
    filterApiLabel: "API",
    filterPlaceholderAll: "All",
    filterMethodSearchPlaceholder: "Search methods…",
    filterApiSearchPlaceholder: "Search APIs…",
    filterClearFilters: "Clear filters",
    filterSelected: (n: number) => `${n} selected`,
    filterNoResults: "No results found.",
    filterClearSelection: "Clear selection",
    filterNoMatches: "No endpoints match your filters.",

    // Generation actions
    noEndpoints: "No endpoints selected",
    readyGenerate: (n: number) =>
      `Ready to generate for ${n} endpoint${n !== 1 ? "s" : ""}`,
    downloadZipDesc: "Download ZIP archive grouped by tags",
    download: "Download",

    // HTTP preview panel
    previewTitle: "HTTP Preview",
    previewSelectEndpoint: "Check endpoints to preview their .http file",
    previewDownload: "Download .http",
    previewCopy: "Copy",
    previewCopied: "Copied!",

    // Home page
    homeTitle: "HTTP File Generator",
    homeSubtitle: "Transform your OpenAPI specifications into ready-to-use .http files in seconds",
    homeGetStarted: "Get Started",
    homeFeature1Title: "Parse OpenAPI Specs",
    homeFeature1Desc: "Upload JSON or YAML OpenAPI 3.x specs and let us do the parsing.",
    homeFeature2Title: "Select Endpoints",
    homeFeature2Desc: "Choose exactly which endpoints you want to generate .http files for.",
    homeFeature3Title: "Generate .http Files",
    homeFeature3Desc: "Instantly generate ready-to-use .http files compatible with VS Code REST Client.",
    homeFeature4Title: "Download as ZIP",
    homeFeature4Desc: "Download all files in one ZIP archive, organized by API tags.",
  },
  fr: {
    // Language toggle
    toggleLanguage: "Changer la langue",
    languageEnglish: "Anglais",
    languageFrench: "Français",

    // Theme toggle
    toggleTheme: "Changer le thème",
    themeLight: "Clair",
    themeDark: "Sombre",
    themeSystem: "Système",

    // Step indicators
    stepUpload: "1. Importer",
    stepSelect: "2. Sélectionner",
    stepGenerate: "3. Générer",

    // Upload page
    uploadTitle: "Importez votre spec OpenAPI",
    uploadDescription:
      "Glissez ou parcourez pour importer un fichier .json, .yaml ou .yml.",

    // File upload zone
    dropzone: "Glissez votre spec OpenAPI ici",
    dropzoneFormats: "Supporte les fichiers .json, .yaml et .yml",
    dropzoneParsing: "Analyse en cours…",
    dropzoneBrowse: "Parcourir les fichiers",
    dropzoneTryAgain: "Réessayer",
    dropzoneParseError: "Échec de l'analyse de la spec OpenAPI",

    // Spec info
    specVersion: "Version",
    specBaseUrl: "URL de base",
    specEndpointCount: (n: number) => `${n} endpoint${n !== 1 ? "s" : ""}`,
    specSelectedCount: (n: number) =>
      `${n} sélectionné${n !== 1 ? "s" : ""}`,
    specSelectAll: "Tout sélectionner",
    specDeselectAll: "Tout désélectionner",
    specUploadNew: "Importer un nouveau fichier",

    // Endpoint group
    endpointsTitle: "Endpoints",
    groupAll: "Tous",
    groupNone: "Aucun",

    // Endpoint filters
    filterSearchPlaceholder: "Rechercher par chemin, résumé…",
    filterMethodLabel: "Méthode",
    filterApiLabel: "API",
    filterPlaceholderAll: "Tous",
    filterMethodSearchPlaceholder: "Rechercher les méthodes…",
    filterApiSearchPlaceholder: "Rechercher les APIs…",
    filterClearFilters: "Effacer les filtres",
    filterSelected: (n: number) => `${n} sélectionné${n !== 1 ? "s" : ""}`,
    filterNoResults: "Aucun résultat trouvé.",
    filterClearSelection: "Effacer la sélection",
    filterNoMatches: "Aucun endpoint ne correspond à vos filtres.",

    // Generation actions
    noEndpoints: "Aucun endpoint sélectionné",
    readyGenerate: (n: number) =>
      `Prêt à générer pour ${n} endpoint${n !== 1 ? "s" : ""}`,
    downloadZipDesc: "Télécharger l'archive ZIP groupée par tags",
    download: "Télécharger",

    // HTTP preview panel
    previewTitle: "Aperçu HTTP",
    previewSelectEndpoint: "Cochez des endpoints pour prévisualiser leur fichier .http",
    previewDownload: "Télécharger .http",
    previewCopy: "Copier",
    previewCopied: "Copié !",

    // Home page
    homeTitle: "HTTP File Generator",
    homeSubtitle: "Transformez vos spécifications OpenAPI en fichiers .http prêts à l'emploi en quelques secondes",
    homeGetStarted: "Commencer",
    homeFeature1Title: "Analyser les specs OpenAPI",
    homeFeature1Desc: "Importez vos specs OpenAPI 3.x en JSON ou YAML et laissez-nous faire l'analyse.",
    homeFeature2Title: "Sélectionner les endpoints",
    homeFeature2Desc: "Choisissez exactement les endpoints pour lesquels générer des fichiers .http.",
    homeFeature3Title: "Générer les fichiers .http",
    homeFeature3Desc: "Générez instantanément des fichiers .http prêts à l'emploi, compatibles avec VS Code REST Client.",
    homeFeature4Title: "Télécharger en ZIP",
    homeFeature4Desc: "Téléchargez tous les fichiers dans une archive ZIP, organisée par tags API.",
  },
} as const;

export type Translations = (typeof translations)[Language];
