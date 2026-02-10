import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
    de: {
        translation: {
            "common": {
                "loading": "Laden...",
                "save": "Speichern",
                "cancel": "Abbrechen",
                "delete": "Löschen",
                "edit": "Bearbeiten",
                "back": "Zurück"
            },
            "nav": {
                "dashboard": "Dashboard",
                "planner": "Planer",
                "shift_planner": "Schichtplan",
                "time_tracking": "Zeiterfassung",
                "absences": "Abwesenheiten",
                "utilization": "Auslastung",
                "reports": "Auswertungen",
                "admin": "Stammdaten"
            },
            "dashboard": {
                "overtime_trend": "Überstunden-Trend (6 Monate)",
                "team_utilization": "Team-Auslastung",
                "hours": "Stunden",
                "no_data": "Keine Daten vorhanden"
            }
        }
    },
    en: {
        translation: {
            "common": {
                "loading": "Loading...",
                "save": "Save",
                "cancel": "Cancel",
                "delete": "Delete",
                "edit": "Edit",
                "back": "Back"
            },
            "nav": {
                "dashboard": "Dashboard",
                "planner": "Planner",
                "shift_planner": "Shift Planner",
                "time_tracking": "Time Tracking",
                "absences": "Absences",
                "utilization": "Utilization",
                "reports": "Reports",
                "admin": "Administration"
            },
            "dashboard": {
                "overtime_trend": "Overtime Trend (6 Months)",
                "team_utilization": "Team Utilization",
                "hours": "Hours",
                "no_data": "No data available"
            }
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'de',
        debug: false,
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
