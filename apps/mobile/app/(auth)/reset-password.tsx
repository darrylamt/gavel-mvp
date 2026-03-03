import { Controller, useForm } from 'react-hook-form'
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, TextInput } from 'react-native'
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
      <Text style={styles.title}>Reset password</Text>

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

      <Pressable style={styles.button} onPress={onSubmit} disabled={formState.isSubmitting}>
        <Text style={styles.buttonText}>{formState.isSubmitting ? 'Sending...' : 'Send reset link'}</Text>
      </Pressable>
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
})
