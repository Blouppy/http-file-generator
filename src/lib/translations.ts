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

    // Generation actions
    noEndpoints: "No endpoints selected",
    readyGenerate: (n: number) =>
      `Ready to generate for ${n} endpoint${n !== 1 ? "s" : ""}`,
    downloadZipDesc: "Download ZIP archive grouped by tags",
    download: "Download",
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

    // Generation actions
    noEndpoints: "Aucun endpoint sélectionné",
    readyGenerate: (n: number) =>
      `Prêt à générer pour ${n} endpoint${n !== 1 ? "s" : ""}`,
    downloadZipDesc: "Télécharger l'archive ZIP groupée par tags",
    download: "Télécharger",
  },
} as const;

export type Translations = (typeof translations)[Language];
