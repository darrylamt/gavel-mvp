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

    // Add a small delay to allow auth state to update, then refresh to home
    setTimeout(() => {
      router.replace('/')
    }, 500)
  })

  return (
    <SafeAreaView style={styles.container}>
      {/* eBay Logo */}
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>eBay</Text>
        <Text style={styles.subtitle}>Buy. Sell. Simple.</Text>
      </View>

      <Text style={styles.title}>Sign in</Text>

      {/* Email Input */}
      <Controller
        control={control}
        name="email"
        rules={{ required: 'Email is required' }}
        render={({ field: { onChange, value } }) => (
          <View>
            <Text style={styles.label}>Email or username</Text>
            <TextInput
              style={[styles.input, formState.errors.email && styles.inputError]}
              value={value}
              onChangeText={onChange}
              placeholder="example@email.com"
              placeholderTextColor="#ccc"
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {formState.errors.email && (
              <Text style={styles.errorText}>{formState.errors.email.message}</Text>
            )}
          </View>
        )}
      />

      {/* Password Input */}
      <Controller
        control={control}
        name="password"
        rules={{ required: 'Password is required' }}
        render={({ field: { onChange, value } }) => (
          <View>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[styles.input, formState.errors.password && styles.inputError]}
              value={value}
              onChangeText={onChange}
              placeholder="••••••••"
              placeholderTextColor="#ccc"
              secureTextEntry
            />
            {formState.errors.password && (
              <Text style={styles.errorText}>{formState.errors.password.message}</Text>
            )}
          </View>
        )}
      />

      {/* Sign In Button */}
      <Pressable 
        style={[styles.button, formState.isSubmitting && styles.buttonDisabled]} 
        onPress={onSubmit} 
        disabled={formState.isSubmitting}
      >
        <Text style={styles.buttonText}>
          {formState.isSubmitting ? 'Signing in...' : 'Sign in'}
        </Text>
      </Pressable>

      {/* Links */}
      <View style={styles.bottomLinks}>
        <Link href="/reset-password" style={styles.link}>
          <Text style={styles.linkText}>Forgot password?</Text>
        </Link>
        <Text style={styles.linkDivider}>•</Text>
        <Link href="/sign-up" style={styles.link}>
          <Text style={styles.linkText}>Create account</Text>
        </Link>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
  },
  brandBlock: {
    marginBottom: 24,
    alignItems: 'center',
  },
  brand: {
    fontSize: 42,
    fontWeight: '900',
    color: '#e53238',
    letterSpacing: -1.5
  },
  subtitle: {
    color: '#666',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500'
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    color: '#333',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 13,
    color: '#333',
    fontSize: 14,
    marginBottom: 14,
  },
  inputError: {
    borderColor: '#e53238',
  },
  errorText: {
    color: '#e53238',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    fontWeight: '500'
  },
  button: {
    backgroundColor: '#e53238',
    borderRadius: 6,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  bottomLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
    gap: 8
  },
  link: {
    paddingVertical: 4,
  },
  linkText: {
    color: '#e53238',
    fontWeight: '600',
    fontSize: 13,
  },
  linkDivider: {
    color: '#ccc',
    fontSize: 16,
  }
})
