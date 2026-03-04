import { Link, useRouter } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native'
import { supabase } from '@/src/lib/supabase'

type SignInForm = {
  email: string
  password: string
}

export default function SignInScreen() {
  const router = useRouter()
  const { control, handleSubmit, formState } = useForm<SignInForm>({
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const { error } = await supabase.auth.signInWithPassword(values)
    if (error) {
      Alert.alert('Sign in failed', error.message)
      return
    }

    router.replace('/')
  })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>Gavel</Text>
        <Text style={styles.subtitle}>Sign in to continue bidding and shopping</Text>
      </View>

      <Text style={styles.title}>Welcome back</Text>

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
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        )}
      />

      <Controller
        control={control}
        name="password"
        rules={{ required: true }}
        render={({ field: { onChange, value } }) => (
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChange}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
          />
        )}
      />

      <Pressable style={styles.button} onPress={onSubmit} disabled={formState.isSubmitting}>
        <Text style={styles.buttonText}>{formState.isSubmitting ? 'Signing in...' : 'Sign In'}</Text>
      </Pressable>

      <View style={styles.links}>
        <Link href="/reset-password" style={styles.link}>
          Forgot password?
        </Link>
        <Link href="/sign-up" style={styles.link}>
          Create account
        </Link>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 22,
    gap: 14,
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  brandBlock: {
    marginBottom: 8,
    gap: 4,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 6,
    color: '#111827',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#111827',
    fontSize: 15,
  },
  button: {
    backgroundColor: '#111827',
    borderRadius: 14,
    padding: 15,
    alignItems: 'center',
    marginTop: 2,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  link: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 13,
  },
})
