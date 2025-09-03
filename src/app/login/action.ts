'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../../utils/supabase/server'

export async function login(formData: FormData) {
   const supabase = await createClient()
   
   const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
   }

   if (!data.email || !data.password) {
      redirect('/login?error=Missing email or password')
   }

   const { error } = await supabase.auth.signInWithPassword(data)
   
   if (error) {
      console.error('Login error:', error.message)
      redirect(`/login?error=${encodeURIComponent(error.message)}`)
   }

   revalidatePath('/', 'layout')
   redirect('/')
}

export async function logout() {
   const supabase = await createClient()
   await supabase.auth.signOut()
   revalidatePath('/', 'layout')
   redirect('/login')
}