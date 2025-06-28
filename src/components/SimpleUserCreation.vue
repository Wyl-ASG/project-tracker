<script>
import { supabase } from '@/lib/supabaseClient'
import { useAuthStore } from '@/stores/auth'

export default {
  name: 'SimpleUserCreation',
  data() {
    return {
      authStore: useAuthStore(),
      form: {
        email: '',
        password: '',
        displayName: '',
        role: 'user'
      },
      loading: false,
      error: '',
      success: ''
    }
  },
  methods: {
    async createUser() {
      this.loading = true
      this.error = ''
      this.success = ''

      try {
        // Check admin status
        const { data: adminCheck } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', this.authStore.user.id)
          .single()

        if (!adminCheck) {
          throw new Error('Unauthorized: Admin access required')
        }

        // Create user
        const { data, error } = await supabase.auth.admin.createUser({
          email: this.form.email,
          password: this.form.password,
          email_confirm: true,
          user_metadata: {
            display_name: this.form.displayName,
            full_name: this.form.displayName,
            role: this.form.role
          }
        })

        if (error) throw error

        this.success = `User ${this.form.email} created successfully!`
        this.form = { email: '', password: '', displayName: '', role: 'user' }

      } catch (error) {
        this.error = error.message
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<template>
  <div class="bg-white p-6 rounded-lg shadow">
    <h2 class="text-xl font-bold mb-4">Create New User</h2>
    
    <div v-if="success" class="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
      {{ success }}
    </div>
    
    <div v-if="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
      {{ error }}
    </div>

    <form @submit.prevent="createUser" class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700">Email</label>
        <input
          v-model="form.email"
          type="email"
          required
          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Display Name</label>
        <input
          v-model="form.displayName"
          type="text"
          required
          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Temporary Password</label>
        <input
          v-model="form.password"
          type="password"
          required
          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
          placeholder="User can change this later"
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700">Role</label>
        <select
          v-model="form.role"
          class="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
        </select>
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md disabled:opacity-50"
      >
        {{ loading ? 'Creating...' : 'Create User' }}
      </button>
    </form>
  </div>
</template>
