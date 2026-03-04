import { Link, useRouter } from 'expo-router'
import { Controller, useForm } from 'react-hook-form'
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native'
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
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>Gavel</Text>
        <Text style={styles.subtitle}>Create your account and start exploring auctions</Text>
      </View>

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
            placeholderTextColor="#9ca3af"
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
            placeholderTextColor="#9ca3af"
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
  link: {
    color: '#111827',
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
    fontSize: 13,
  },
})
