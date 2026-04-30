export type Language = "en" | "fr";

export const translations = {
  en: {
    // Language toggle
    toggleLanguage: "Toggle language",
    languageEnglish: "English",
    languageFrench: "French",

    // GitHub link
    githubRepository: "View source on GitHub",

    // Theme toggle
    toggleTheme: "Toggle theme",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",

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
    filterSearchPlaceholder: "Search endpoints...",
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
    readyGenerate: (n: number) => `Ready to generate for ${n} endpoint${n !== 1 ? "s" : ""}`,
    downloadZipDesc: "Download ZIP archive grouped by tags",
    download: "Download",

    // HTTP preview panel
    previewTitle: "HTTP Preview",
    previewSelectEndpoint: "Check endpoints to preview their .http file",
    previewCopy: "Copy",
    previewCopied: "Copied!",
    previewViewSpec: "View Spec",

    // Spec viewer sheet
    specViewerTitle: "Specification",
    specViewerOpenButton: "View endpoint specification",
    specViewerOverviewTab: "Overview",
    specViewerModelsTab: "Models",
    specViewerParametersTitle: "Parameters",
    specViewerRequestBodyTitle: "Request Body",
    specViewerModelsTitle: "Models",
    specViewerProperties: "Properties",
    specViewerEnumValues: "Enum values",
    specViewerRequired: "required",
    specViewerOptional: "optional",
    specViewerNoProperties: "No properties defined.",

    // Home page
    homeTitle: "HTTP File Generator",
    homeSubtitle: "Transform your OpenAPI specifications into ready-to-use .http files in seconds",
    homeGetStarted: "Get Started",
    homeCompatibleWith: "Compatible with VS Code REST Client & JetBrains HTTP Client",
    homePreviewTitle: "See it in action",
    homePreviewDesc:
      "Browse your endpoints, select exactly what you need, and instantly preview the generated .http file.",
    homeHowItWorksTitle: "How it works",
    homeStep1Title: "Upload your spec",
    homeStep1Desc: "Drop a JSON or YAML OpenAPI 3.x spec file and we'll parse it instantly.",
    homeStep2Title: "Select endpoints",
    homeStep2Desc: "Browse and filter endpoints by method or tag. Check exactly what you need.",
    homeStep3Title: "Download .http files",
    homeStep3Desc:
      "Get ready-to-use .http files organized by API tags, or download them all as a ZIP.",
    homePrivacyTitle: "Your data stays yours",
    homePrivacyDesc:
      "Your OpenAPI specs are processed entirely in your browser — they are never uploaded to or stored on any server. Your API definitions stay private, always.",
    homeCtaTitle: "Ready to streamline your API workflow?",
    homeCtaDesc:
      "Start generating .http files from your OpenAPI spec in seconds. No login required.",
    homeFooterMadeWith: "Made with",
    homeFooterBy: "by Blouppy",
  },
  fr: {
    // Language toggle
    toggleLanguage: "Changer la langue",
    languageEnglish: "Anglais",
    languageFrench: "Français",

    // GitHub link
    githubRepository: "Voir le code source sur GitHub",

    // Theme toggle
    toggleTheme: "Changer le thème",
    themeLight: "Clair",
    themeDark: "Sombre",
    themeSystem: "Système",

    // Upload page
    uploadTitle: "Importez votre spec OpenAPI",
    uploadDescription: "Glissez ou parcourez pour importer un fichier .json, .yaml ou .yml.",

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
    specSelectedCount: (n: number) => `${n} sélectionné${n !== 1 ? "s" : ""}`,
    specSelectAll: "Tout sélectionner",
    specDeselectAll: "Tout désélectionner",
    specUploadNew: "Importer un nouveau fichier",

    // Endpoint group
    endpointsTitle: "Endpoints",
    groupAll: "Tous",
    groupNone: "Aucun",

    // Endpoint filters
    filterSearchPlaceholder: "Rechercher des endpoints...",
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
    readyGenerate: (n: number) => `Prêt à générer pour ${n} endpoint${n !== 1 ? "s" : ""}`,
    downloadZipDesc: "Télécharger l'archive ZIP groupée par tags",
    download: "Télécharger",

    // HTTP preview panel
    previewTitle: "Aperçu HTTP",
    previewSelectEndpoint: "Cochez des endpoints pour prévisualiser leur fichier .http",
    previewCopy: "Copier",
    previewCopied: "Copié !",
    previewViewSpec: "Voir la spec",

    // Spec viewer sheet
    specViewerTitle: "Spécification",
    specViewerOpenButton: "Voir la spécification de l'endpoint",
    specViewerOverviewTab: "Vue d'ensemble",
    specViewerModelsTab: "Modèles",
    specViewerParametersTitle: "Paramètres",
    specViewerRequestBodyTitle: "Corps de la requête",
    specViewerModelsTitle: "Modèles",
    specViewerProperties: "Propriétés",
    specViewerEnumValues: "Valeurs d'énumération",
    specViewerRequired: "requis",
    specViewerOptional: "optionnel",
    specViewerNoProperties: "Aucune propriété définie.",

    // Home page
    homeTitle: "HTTP File Generator",
    homeSubtitle:
      "Transformez vos spécifications OpenAPI en fichiers .http prêts à l'emploi en quelques secondes",
    homeGetStarted: "Commencer",
    homeCompatibleWith: "Compatible avec VS Code REST Client & JetBrains HTTP Client",
    homePreviewTitle: "Voyez-le en action",
    homePreviewDesc:
      "Parcourez vos endpoints, sélectionnez exactement ce dont vous avez besoin, et prévisualisez instantanément le fichier .http généré.",
    homeHowItWorksTitle: "Comment ça fonctionne",
    homeStep1Title: "Importez votre spec",
    homeStep1Desc:
      "Déposez un fichier spec OpenAPI 3.x en JSON ou YAML et nous l'analyserons instantanément.",
    homeStep2Title: "Sélectionnez les endpoints",
    homeStep2Desc:
      "Parcourez et filtrez les endpoints par méthode ou tag. Cochez exactement ce dont vous avez besoin.",
    homeStep3Title: "Téléchargez les fichiers .http",
    homeStep3Desc:
      "Obtenez des fichiers .http prêts à l'emploi organisés par tags API, ou téléchargez-les tous en ZIP.",
    homePrivacyTitle: "Vos données restent les vôtres",
    homePrivacyDesc:
      "Vos specs OpenAPI sont traitées entièrement dans votre navigateur — elles ne sont jamais envoyées ni stockées sur un serveur. Vos définitions API restent privées, en permanence.",
    homeCtaTitle: "Prêt à simplifier votre flux de travail API ?",
    homeCtaDesc:
      "Commencez à générer des fichiers .http depuis votre spec OpenAPI en quelques secondes. Sans inscription.",
    homeFooterMadeWith: "Fait avec",
    homeFooterBy: "par Blouppy",
  },
} as const;

export type Translations = (typeof translations)[Language];
