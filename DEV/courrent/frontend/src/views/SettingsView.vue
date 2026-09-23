<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import ToggleSwitch from '../components/ToggleSwitch.vue'
import SelectField from '../components/SelectField.vue'

const authStore = useAuthStore()

// URL de base de l'API backend (même convention que SetupView.vue)
const API_BASE = 'http://localhost:3000/api'

/* ------------------------------------------------------------------ */
/* Onglets                                                             */
/* ------------------------------------------------------------------ */
const tabs = [
  { id: 'general', label: 'Général', icon: 'fas fa-sliders' },
  { id: 'auth', label: 'Authentification et sécurité', icon: 'fas fa-shield-halved' },
  { id: 'modules', label: 'Modules', icon: 'fas fa-puzzle-piece' },
  { id: 'logs', label: 'Maintenance et Logs', icon: 'fas fa-clipboard-list' },
  { id: 'mail', label: 'Courrier', icon: 'fas fa-envelope' },
]
const activeTab = ref('general')

/* ------------------------------------------------------------------ */
/* Toast simple (local à cette vue)                                    */
/* ------------------------------------------------------------------ */
const toast = reactive({ visible: false, message: '', type: 'success' })
let toastTimer = null

function showToast(message, type = 'success') {
  toast.message = message
  toast.type = type
  toast.visible = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.visible = false), 3000)
}

const toastClasses = computed(() => {
  const base =
    'fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl border font-bold text-xs flex items-center gap-3 transition-all duration-300'
  const byType = {
    success: 'bg-emerald-500 text-white border-emerald-400',
    info: 'bg-blue-600 text-white border-blue-500',
    error: 'bg-rose-600 text-white border-rose-500',
  }
  return `${base} ${byType[toast.type] || byType.success}`
})

/* ------------------------------------------------------------------ */
/* ONGLET 1 : Général (mise à jour + langue)                           */
/* -- Pas de route backend pour l'instant -> état local, à brancher --  */
/* TODO: backend route à créer, ex. GET/POST /api/admin/updates        */
/* TODO: backend route à créer, ex. GET/POST /api/admin/language       */
/* ------------------------------------------------------------------ */
const appVersion = ref('1.0.0')
const isCheckingUpdate = ref(false)
const updateAvailable = ref(true)
const latestVersion = ref('1.2.0')
const updateNote = ref('Amélioration des logs')
const versionChannel = ref('stable')
const autoCheckUpdate = ref(true)

const language = ref('fr')
const debugLanguage = ref('fr')

const versionChannelOptions = [
  { value: 'stable', label: 'Canal Stable (Recommandé)' },
  { value: 'beta', label: 'Canal Bêta' },
  { value: 'nightly', label: 'Canal Nightly (Dev)' },
]

// Paquets de langue : statut installé / disponible, avec version et maj éventuelle
// TODO: backend route à créer, ex. GET /api/admin/languages, POST /api/admin/languages/:code/install|update, DELETE /api/admin/languages/:code
const languagePacks = reactive([
  { code: 'fr', name: 'Français', status: 'installed', version: '1.2.0', updateAvailable: false },
  { code: 'en', name: 'English', status: 'installed', version: '1.1.0', updateAvailable: true, latestVersion: '1.2.0' },
  { code: 'es', name: 'Español', status: 'available', version: null },
  { code: 'de', name: 'Deutsch', status: 'available', version: null },
])

const installedLanguageOptions = computed(() =>
  languagePacks
    .filter((pack) => pack.status === 'installed')
    .map((pack) => ({ value: pack.code, label: pack.name })),
)

// Séparation pour l'affichage : la liste principale ne montre que les langues installées,
// les autres sont proposées au téléchargement dans un menu déroulant (évite une liste trop longue)
const installedLanguagePacks = computed(() => languagePacks.filter((p) => p.status === 'installed'))
const availableLanguagePacks = computed(() => languagePacks.filter((p) => p.status === 'available'))
const isAddLanguageOpen = ref(false)

const debugLanguageOptions = computed(() => installedLanguageOptions.value)

const pendingLanguageAction = ref(null) // code du paquet en cours de traitement

function installLanguage(code) {
  const pack = languagePacks.find((p) => p.code === code)
  if (!pack) return
  pendingLanguageAction.value = code
  // TODO: remplacer par un vrai appel API
  setTimeout(() => {
    pack.status = 'installed'
    pack.version = '1.2.0'
    pack.updateAvailable = false
    pendingLanguageAction.value = null
    showToast(`Paquet "${pack.name}" téléchargé.`, 'success')
  }, 800)
}

function updateLanguage(code) {
  const pack = languagePacks.find((p) => p.code === code)
  if (!pack) return
  pendingLanguageAction.value = code
  // TODO: remplacer par un vrai appel API
  setTimeout(() => {
    pack.version = pack.latestVersion || pack.version
    pack.updateAvailable = false
    pendingLanguageAction.value = null
    showToast(`Paquet "${pack.name}" mis à jour.`, 'success')
  }, 800)
}

function removeLanguage(code) {
  const pack = languagePacks.find((p) => p.code === code)
  if (!pack) return
  if (code === language.value || code === debugLanguage.value) {
    showToast('Impossible de supprimer une langue actuellement utilisée.', 'error')
    return
  }
  pendingLanguageAction.value = code
  // TODO: remplacer par un vrai appel API
  setTimeout(() => {
    pack.status = 'available'
    pack.version = null
    pack.updateAvailable = false
    pendingLanguageAction.value = null
    showToast(`Paquet "${pack.name}" supprimé.`, 'info')
  }, 500)
}

const autoUpdateLanguagePacks = ref(false)

function checkForUpdate() {
  isCheckingUpdate.value = true
  // TODO: remplacer par un vrai appel API
  setTimeout(() => {
    isCheckingUpdate.value = false
    showToast('Recherche terminée.', 'info')
  }, 1000)
}

function installUpdate() {
  showToast(`Installation de la version ${latestVersion.value} lancée...`, 'info')
  // TODO: remplacer par un vrai appel API + suivi de progression
}

/* ------------------------------------------------------------------ */
/* ONGLET 2 : Authentification et sécurité                             */
/* -- Pas de route backend pour l'instant -> état local, à brancher --  */
/* TODO: backend route à créer, ex. GET/POST /api/admin/auth-provider  */
/* ------------------------------------------------------------------ */
const authProvider = ref('local') // 'local' | 'ldap' | 'oauth2'
const ldapConfig = reactive({ host: 'ldap://192.168.1.10:389', baseDn: 'dc=entreprise,dc=local' })
const oauthConfig = reactive({ clientId: 'wakejs-client', issuerUrl: '' })

/* ------------------------------------------------------------------ */
/* ONGLET 3 : Modules (activer/désactiver, WOL/Fog gérés ailleurs)     */
/* TODO: backend route à créer, ex. GET/POST /api/admin/modules        */
/* ------------------------------------------------------------------ */
const modules = reactive([
  { id: 'dashboard', name: 'DashBoard', icon: 'fas fa-chart-pie', enabled: true, description: 'Vue d\'ensemble du réseau' },
  { id: 'wol', name: 'Wake On Lan', icon: 'fas fa-network-wired', enabled: true, description: 'Envoi de paquets magiques' },
  { id: 'fog', name: 'Fog Image Viewer', icon: 'fas fa-images', enabled: false, description: 'Gestion des images FOG' },
])

/* ------------------------------------------------------------------ */
/* ONGLET 4 : Maintenance et Logs -- BRANCHÉ SUR /api/admin/logs        */
/* ------------------------------------------------------------------ */
const logs = ref([])
const isLoadingLogs = ref(false)
const logsError = ref('')

async function fetchLogs() {
  isLoadingLogs.value = true
  logsError.value = ''
  try {
    const response = await fetch(`${API_BASE}/admin/logs`, {
      method: 'GET',
      credentials: 'include', // envoie le cookie de session s'il existe
      headers: {
        'Content-Type': 'application/json',
        // Ajuste selon le mécanisme réel de requireAuth (cookie vs JWT bearer) :
        ...(authStore.token ? { Authorization: `Bearer ${authStore.token}` } : {}),
      },
    })
    const data = await response.json()
    if (response.ok && data.success) {
      logs.value = data.logs
    } else {
      logsError.value = data.message || 'Impossible de charger les journaux.'
    }
  } catch (err) {
    logsError.value = 'Erreur réseau lors de la récupération des logs.'
  } finally {
    isLoadingLogs.value = false
  }
}

function formatLogDate(dateStr) {
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const logRetentionDays = ref(30)
const logLevel = ref('info')
const logLevelOptions = [
  { value: 'debug', label: 'Débogage (Debug)' },
  { value: 'info', label: 'Information (Info)' },
  { value: 'warn', label: 'Avertissements (Warn)' },
  { value: 'error', label: 'Erreurs uniquement (Error)' },
]

onMounted(() => {
  if (activeTab.value === 'logs') fetchLogs()
})

function selectTab(tabId) {
  activeTab.value = tabId
  if (tabId === 'logs' && logs.value.length === 0 && !isLoadingLogs.value) {
    fetchLogs()
  }
}

/* ------------------------------------------------------------------ */
/* ONGLET 5 : Courrier (SMTP)                                          */
/* TODO: backend route à créer, ex. GET/POST /api/admin/mail            */
/* ------------------------------------------------------------------ */
const mailConfig = reactive({
  host: '',
  port: 587,
  user: '',
  password: '',
  fromAddress: '',
  secure: true,
})
const isSendingTestMail = ref(false)

function sendTestMail() {
  isSendingTestMail.value = true
  // TODO: remplacer par un vrai appel API
  setTimeout(() => {
    isSendingTestMail.value = false
    showToast('Email de test envoyé (simulation).', 'info')
  }, 900)
}

/* ------------------------------------------------------------------ */
/* Sauvegarde globale                                                   */
/* ------------------------------------------------------------------ */
const isSaving = ref(false)

async function saveSettings() {
  isSaving.value = true
  // TODO: appeler la route backend correspondant à activeTab.value une fois créée
  setTimeout(() => {
    isSaving.value = false
    showToast('Configuration sauvegardée avec succès !', 'success')
  }, 700)
}
</script>

<template>
  <div class="space-y-6">
    <!-- Onglets + Sauvegarder (le titre de page est déjà affiché par le Header global) -->
    <div
      class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-700/80"
    >
      <div class="flex gap-2 overflow-x-auto w-full sm:w-auto">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="selectTab(tab.id)"
          class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap"
          :class="
            activeTab === tab.id
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
          "
        >
          <i :class="tab.icon"></i>
          <span>{{ tab.label }}</span>
        </button>
      </div>

      <button
        @click="saveSettings"
        :disabled="isSaving"
        class="w-full sm:w-auto shrink-0 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2 active:scale-95"
      >
        <i :class="isSaving ? 'fas fa-spinner animate-spin' : 'fas fa-save'"></i>
        <span>{{ isSaving ? 'Enregistrement...' : 'Sauvegarder' }}</span>
      </button>
    </div>

    <!-- ONGLET GÉNÉRAL -->
    <div v-if="activeTab === 'general'" class="space-y-4">
      <!-- Mise à jour -->
      <div class="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-lg font-black">
              <i class="fas fa-cube"></i>
            </div>
            <div class="flex items-center gap-2">
              <h4 class="font-black text-base text-slate-800 dark:text-slate-100">Mise à jour</h4>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">
                v{{ appVersion }}
              </span>
            </div>
          </div>

          <button
            @click="checkForUpdate"
            :disabled="isCheckingUpdate"
            class="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 active:scale-95"
          >
            <i class="fas fa-arrows-rotate" :class="{ 'animate-spin': isCheckingUpdate }"></i>
            <span>Vérifier les mises à jour</span>
          </button>
        </div>

        <div v-if="updateAvailable" class="bg-amber-500/10 border-2 border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <i class="fas fa-circle-exclamation text-amber-500 text-lg"></i>
            <div>
              <h5 class="font-black text-xs text-slate-900 dark:text-white">
                Mise à jour v{{ latestVersion }} disponible
              </h5>
              <p class="text-[11px] text-slate-400">{{ updateNote }}</p>
            </div>
          </div>
          <button
            @click="installUpdate"
            class="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95"
          >
            Mettre à jour
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <SelectField v-model="versionChannel" label="Canal de version" :options="versionChannelOptions" />
          </div>

          <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span class="block text-xs font-bold text-slate-800 dark:text-slate-100">Vérification automatique</span>
              <span class="text-[10px] text-slate-400">Rechercher les maj en arrière-plan</span>
            </div>
            <ToggleSwitch v-model="autoCheckUpdate" />
          </div>
        </div>
      </div>

      <!-- Langue -->
      <div class="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center text-lg font-black">
              <i class="fas fa-globe"></i>
            </div>
            <div>
              <h4 class="font-black text-base text-slate-800 dark:text-slate-100">Langue</h4>
              <p class="text-xs text-slate-400">Display and UI language</p>
            </div>
          </div>
          <div class="w-full sm:w-56">
            <SelectField v-model="language" :options="installedLanguageOptions" />
          </div>
        </div>

        <!-- Gestionnaire de paquets de langue : seules les langues installées sont listées -->
        <div class="space-y-2">
          <span class="block text-[10px] font-black uppercase text-slate-400 px-1">Paquets de langue installés</span>

          <div
            v-for="pack in installedLanguagePacks"
            :key="pack.code"
            class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-9 h-9 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-[10px] font-black uppercase">
                {{ pack.code }}
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{{ pack.name }}</span>
                  <span
                    v-if="pack.updateAvailable"
                    class="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0"
                  >
                    Maj disponible
                  </span>
                </div>
                <span class="text-[10px] text-slate-400">Version {{ pack.version }}</span>
              </div>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                v-if="pack.updateAvailable"
                @click="updateLanguage(pack.code)"
                :disabled="pendingLanguageAction === pack.code"
                class="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 px-3 py-2 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 active:scale-95"
              >
                <i class="fas fa-arrow-up" :class="{ 'animate-pulse': pendingLanguageAction === pack.code }"></i>
                <span>Mettre à jour</span>
              </button>
              <button
                @click="removeLanguage(pack.code)"
                :disabled="pendingLanguageAction === pack.code || pack.code === language || pack.code === debugLanguage"
                :title="pack.code === language || pack.code === debugLanguage ? 'Langue actuellement utilisée' : 'Supprimer'"
                class="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-rose-500 disabled:opacity-30 disabled:hover:text-slate-500 transition-colors"
              >
                <i class="fas fa-trash text-xs"></i>
              </button>
            </div>
          </div>

          <p v-if="installedLanguagePacks.length === 0" class="text-[11px] text-slate-400 text-center py-3">
            Aucune langue installée.
          </p>

          <!-- Menu déroulant : télécharger une langue supplémentaire -->
          <div class="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              @click="isAddLanguageOpen = !isAddLanguageOpen"
              class="w-full flex items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              <span class="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                <i class="fas fa-plus"></i>
                <span>Ajouter une langue</span>
                <span class="text-[10px] font-medium text-slate-400">({{ availableLanguagePacks.length }} disponible{{ availableLanguagePacks.length > 1 ? 's' : '' }})</span>
              </span>
              <i class="fas fa-chevron-down text-[10px] text-slate-400 transition-transform" :class="{ 'rotate-180': isAddLanguageOpen }"></i>
            </button>

            <Transition
              enter-active-class="transition-all duration-200 ease-out"
              enter-from-class="opacity-0 max-h-0"
              enter-to-class="opacity-100 max-h-96"
              leave-active-class="transition-all duration-150 ease-in"
              leave-from-class="opacity-100 max-h-96"
              leave-to-class="opacity-0 max-h-0"
            >
              <div v-if="isAddLanguageOpen" class="divide-y divide-slate-100 dark:divide-slate-800 border-t border-slate-200 dark:border-slate-800 max-h-64 overflow-y-auto">
                <div
                  v-for="pack in availableLanguagePacks"
                  :key="pack.code"
                  class="p-3 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-3"
                >
                  <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[10px] font-black uppercase">
                      {{ pack.code }}
                    </div>
                    <span class="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">{{ pack.name }}</span>
                  </div>
                  <button
                    @click="installLanguage(pack.code)"
                    :disabled="pendingLanguageAction === pack.code"
                    class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1.5 active:scale-95 shrink-0"
                  >
                    <i class="fas fa-download" :class="{ 'animate-bounce': pendingLanguageAction === pack.code }"></i>
                    <span>Télécharger</span>
                  </button>
                </div>

                <p v-if="availableLanguagePacks.length === 0" class="text-[11px] text-slate-400 text-center py-3">
                  Toutes les langues disponibles sont déjà installées.
                </p>
              </div>
            </Transition>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span class="block text-xs font-bold text-slate-800 dark:text-slate-100">Mettre à jour automatiquement</span>
              <span class="text-[10px] text-slate-400">Télécharger les maj de langue installées</span>
            </div>
            <ToggleSwitch v-model="autoUpdateLanguagePacks" />
          </div>

          <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <SelectField v-model="debugLanguage" label="Langue du débogage et Logs" :options="debugLanguageOptions" />
          </div>
        </div>
      </div>
    </div>

    <!-- ONGLET AUTHENTIFICATION -->
    <div v-else-if="activeTab === 'auth'" class="space-y-4">
      <div class="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h4 class="font-black text-sm text-slate-800 dark:text-slate-100">Méthode d'authentification</h4>
          <p class="text-xs text-slate-400">Choisissez le mode d'accès au panneau d'administration</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label
            v-for="opt in [
              { id: 'local', label: 'Base Locale', desc: 'Utilisateurs stockés en base', icon: 'fas fa-database' },
              { id: 'ldap', label: 'Active Directory / LDAP', desc: 'Annuaire d\'entreprise centralisé', icon: 'fas fa-sitemap' },
              { id: 'oauth2', label: 'OAuth2 / OpenID', desc: 'Keycloak, Google, Authelia', icon: 'fas fa-key' },
            ]"
            :key="opt.id"
            @click="authProvider = opt.id"
            class="p-3.5 rounded-xl border-2 cursor-pointer transition-all flex flex-col gap-1"
            :class="authProvider === opt.id ? 'border-blue-500 bg-blue-500/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'"
          >
            <div class="flex items-center justify-between">
              <i :class="opt.icon" class="text-blue-500 text-sm"></i>
              <input type="radio" name="auth_type" :value="opt.id" v-model="authProvider" class="accent-blue-600" />
            </div>
            <span class="font-bold text-xs text-slate-800 dark:text-slate-100">{{ opt.label }}</span>
            <span class="text-[10px] text-slate-400">{{ opt.desc }}</span>
          </label>
        </div>

        <div v-if="authProvider === 'ldap'" class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <h5 class="font-black text-xs uppercase text-blue-500">Paramètres LDAP</h5>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Serveur LDAP</label>
              <input v-model="ldapConfig.host" type="text" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Base DN</label>
              <input v-model="ldapConfig.baseDn" type="text" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
            </div>
          </div>
        </div>

        <div v-if="authProvider === 'oauth2'" class="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <h5 class="font-black text-xs uppercase text-blue-500">Paramètres OpenID Connect</h5>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Client ID</label>
              <input v-model="oauthConfig.clientId" type="text" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
            </div>
            <div>
              <label class="block text-[10px] font-bold text-slate-400 mb-1">Issuer URL</label>
              <input v-model="oauthConfig.issuerUrl" type="text" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ONGLET MODULES -->
    <div v-else-if="activeTab === 'modules'" class="space-y-4">
      <div class="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div>
          <h4 class="font-black text-sm text-slate-800 dark:text-slate-100">Modules actifs</h4>
          <p class="text-xs text-slate-400">Active ou désactive les modules visibles dans le menu</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div
            v-for="mod in modules"
            :key="mod.id"
            class="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between"
          >
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center text-sm">
                <i :class="mod.icon"></i>
              </div>
              <div>
                <span class="block text-xs font-bold text-slate-800 dark:text-slate-100">{{ mod.name }}</span>
                <span class="text-[10px] text-slate-400">{{ mod.description }}</span>
              </div>
            </div>
            <ToggleSwitch v-model="mod.enabled" />
          </div>
        </div>
      </div>
    </div>

    <!-- ONGLET MAINTENANCE ET LOGS -->
    <div v-else-if="activeTab === 'logs'" class="space-y-4">
      <div class="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h4 class="font-black text-sm text-slate-800 dark:text-slate-100">Journaux d'activité</h4>
            <p class="text-xs text-slate-400">100 dernières actions enregistrées</p>
          </div>
          <button
            @click="fetchLogs"
            :disabled="isLoadingLogs"
            class="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 active:scale-95"
          >
            <i class="fas fa-arrows-rotate" :class="{ 'animate-spin': isLoadingLogs }"></i>
            <span>Rafraîchir</span>
          </button>
        </div>

        <div v-if="logsError" class="bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-bold rounded-xl p-3">
          {{ logsError }}
        </div>

        <div v-else-if="isLoadingLogs" class="text-xs font-bold text-slate-400 text-center py-6">
          Chargement des journaux...
        </div>

        <div v-else-if="logs.length === 0" class="text-xs font-bold text-slate-400 text-center py-6">
          Aucun journal disponible.
        </div>

        <div v-else class="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              <tr class="bg-slate-100 dark:bg-slate-800/80 text-slate-400 font-black uppercase text-[10px] tracking-wider">
                <th class="p-3">Date</th>
                <th class="p-3">Utilisateur</th>
                <th class="p-3">Module</th>
                <th class="p-3">Action</th>
                <th class="p-3">Détails</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900 font-bold text-slate-700 dark:text-slate-200">
              <tr v-for="log in logs" :key="log.id" class="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                <td class="p-3 text-slate-400 font-normal whitespace-nowrap">{{ formatLogDate(log.created_at) }}</td>
                <td class="p-3">{{ log.user_name || log.user_email || 'Système' }}</td>
                <td class="p-3">
                  <span class="px-2 py-1 rounded-md text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase font-black">
                    {{ log.module }}
                  </span>
                </td>
                <td class="p-3">{{ log.action }}</td>
                <td class="p-3 text-slate-400 font-normal">{{ log.details }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
            <SelectField v-model="logLevel" label="Niveau de Log" :options="logLevelOptions" />
          </div>
          <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <label class="block text-[10px] font-black uppercase text-slate-400">Rétention des logs (jours)</label>
            <input v-model.number="logRetentionDays" type="number" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
          </div>
        </div>
      </div>
    </div>

    <!-- ONGLET COURRIER -->
    <div v-else-if="activeTab === 'mail'" class="space-y-4">
      <div class="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4">
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h4 class="font-black text-sm text-slate-800 dark:text-slate-100">Serveur SMTP</h4>
            <p class="text-xs text-slate-400">Utilisé pour les notifications et la récupération de mot de passe</p>
          </div>
          <button
            @click="sendTestMail"
            :disabled="isSendingTestMail"
            class="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 px-4 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 active:scale-95"
          >
            <i class="fas fa-paper-plane" :class="{ 'animate-pulse': isSendingTestMail }"></i>
            <span>Envoyer un email de test</span>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <label class="block text-[10px] font-black uppercase text-slate-400">Hôte SMTP</label>
            <input v-model="mailConfig.host" type="text" placeholder="smtp.entreprise.com" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
          </div>
          <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <label class="block text-[10px] font-black uppercase text-slate-400">Port</label>
            <input v-model.number="mailConfig.port" type="number" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
          </div>
          <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <label class="block text-[10px] font-black uppercase text-slate-400">Utilisateur</label>
            <input v-model="mailConfig.user" type="text" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
          </div>
          <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <label class="block text-[10px] font-black uppercase text-slate-400">Mot de passe</label>
            <input v-model="mailConfig.password" type="password" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
          </div>
          <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
            <label class="block text-[10px] font-black uppercase text-slate-400">Adresse d'expédition</label>
            <input v-model="mailConfig.fromAddress" type="email" placeholder="noreply@entreprise.com" class="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-xs font-bold" />
          </div>
          <div class="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between">
            <span class="text-xs font-bold text-slate-800 dark:text-slate-100">Connexion sécurisée (TLS)</span>
            <ToggleSwitch v-model="mailConfig.secure" />
          </div>
        </div>
      </div>
    </div>

    <!-- Toast -->
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-6"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-300 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-6"
    >
      <div v-if="toast.visible" :class="toastClasses">
        <i class="fas fa-check-circle text-base"></i>
        <span>{{ toast.message }}</span>
      </div>
    </Transition>
  </div>
</template>