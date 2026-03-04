import { Controller, useForm } from 'react-hook-form'
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native'
import { supabase } from '@/src/lib/supabase'

type ResetForm = {
  email: string
}

export default function ResetPasswordScreen() {
  const { control, handleSubmit, formState } = useForm<ResetForm>({
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = handleSubmit(async (values) => {
    const { error } = await supabase.auth.resetPasswordForEmail(values.email)
    if (error) {
      Alert.alert('Reset failed', error.message)
      return
    }

    Alert.alert('Reset requested', 'Check your email for reset instructions.')
  })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.brandBlock}>
        <Text style={styles.brand}>Gavel</Text>
      </View>

      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>Enter your email and we’ll send a reset link.</Text>

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

      <Pressable style={styles.button} onPress={onSubmit} disabled={formState.isSubmitting}>
        <Text style={styles.buttonText}>{formState.isSubmitting ? 'Sending...' : 'Send reset link'}</Text>
      </Pressable>
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
    marginBottom: 6,
  },
  brand: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 2,
    color: '#111827',
  },
  subtitle: {
    color: '#6b7280',
    marginBottom: 8,
    fontSize: 14,
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
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
})
