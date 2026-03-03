import { Link, useRouter } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput } from 'react-native'
import { supabase } from '@/src/lib/supabase'

type SignUpForm = {
  email: string
  password: string
}

export default function SignUpScreen() {
  const router = useRouter()
  const { control, handleSubmit, formState } = useForm<SignUpForm>({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const { error } = await supabase.auth.signUp(values)
    if (error) {
      Alert.alert('Sign up failed', error.message)
      return
    }

    Alert.alert('Account created', 'Check your email for verification if required.')
    router.replace('/sign-in')
  })

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Create your account</Text>

      <Controller
        control={control}
        name="email"
        rules={{ required: true }}
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder="Email"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        rules={{ required: true, minLength: 6 }}
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder="Password"
            secureTextEntry
          />
        )}
      />

      <Pressable style={styles.button} onPress={onSubmit} disabled={formState.isSubmitting}>
        <Text style={styles.buttonText}>{formState.isSubmitting ? 'Creating...' : 'Create Account'}</Text>
      </Pressable>

      <Link href="/sign-in" style={styles.link}>
        Already have an account? Sign in
      </Link>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    gap: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  link: {
    color: '#1d4ed8',
    fontWeight: '600',
    marginTop: 8,
  },
})
