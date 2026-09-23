<template>
  <div>
    <h1>Accueil de l'application</h1>
    
    <!-- On lit directement authStore.user -->
    <div v-if="authStore.user">
      <p>Bienvenue, <strong>{{ authStore.user.name }}</strong> ({{ authStore.user.email }}) !</p>
      <button @click="handleLogout">Se déconnecter</button>
    </div>
    
    <div v-else>
      <p>Vous n'êtes pas connecté.</p>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth' // 1. Importer

const router = useRouter()
const authStore = useAuthStore() // 2. Instancier

const handleLogout = () => {
  authStore.logout() // 3. Appel de l'action de déconnexion
  router.push('/login')
}
</script>