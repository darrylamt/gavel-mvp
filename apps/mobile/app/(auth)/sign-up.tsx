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
      {/* eBay Logo */}
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>eBay</Text>
        <Text style={styles.subtitle}>Join millions of buyers & sellers</Text>
      </View>

      <Text style={styles.title}>Create your account</Text>

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
        rules={{ required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } }}
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

      {/* Create Button */}
      <Pressable 
        style={[styles.button, formState.isSubmitting && styles.buttonDisabled]} 
        onPress={onSubmit} 
        disabled={formState.isSubmitting}
      >
        <Text style={styles.buttonText}>
          {formState.isSubmitting ? 'Creating account...' : 'Create account'}
        </Text>
      </Pressable>

      {/* Privacy Note */}
      <Text style={styles.privacyNote}>
        We'll treat your data with respect. See our Privacy Policy.
      </Text>

      {/* Sign In Link */}
      <View style={styles.signInContainer}>
        <Text style={styles.signInText}>Already have an account? </Text>
        <Link href="/sign-in" asChild>
          <Pressable>
            <Text style={styles.signInLink}>Sign in</Text>
          </Pressable>
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
  privacyNote: {
    textAlign: 'center',
    fontSize: 12,
    color: '#666',
    marginTop: 14,
    lineHeight: 18
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signInText: {
    color: '#666',
    fontSize: 13,
  },
  signInLink: {
    color: '#e53238',
    fontWeight: '600',
    fontSize: 13,
  },
})
