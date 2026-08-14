import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import type { AxiosError } from 'axios'
import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { type Resolver, useForm } from 'react-hook-form'
import { GoogleIcon } from '@/assets/svgs/google-icon'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { TypographyMuted, TypographyP } from '@/components/ui/typography'
import { ROUTES } from '@/enum/routes'
import { type ILoginFormType, SsoProviders } from '@/interface/auth'
import { getTranslations } from '@/lib/translation'
import { useGetGoogleLoginURL, useLoginMutation } from '@/queries/use-auth-query'
import { createLoginFormSchemas } from '@/schemas/auth-schemas'

export const Route = createFileRoute('/_guest/login')({ component: LoginPage })

function LoginPage() {
  const translation = getTranslations()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const { mutateAsync: getGoogleLoginURL, isPending: isGettingGoogleLoginURL } =
    useGetGoogleLoginURL({
      onSuccess: (data) => {
        console.log(data)
      },
    })
  const form = useForm<ILoginFormType>({
    mode: 'onChange',
    resolver: zodResolver(createLoginFormSchemas() as never) as Resolver<ILoginFormType>,
    defaultValues: {
      email: '',
      password: '',
      is_save_session: false,
    },
  })
  const {
    formState: { isValid },
  } = form

  const { mutateAsync, isPending, error } = useLoginMutation({
    onSuccess: () => {
      navigate({ to: ROUTES.HOME as string })
    },
  })

  const onSubmit = (data: ILoginFormType) => {
    mutateAsync({
      email: data.email,
      password: data.password,
      is_save_session: data.is_save_session,
    })
  }

  const serverError = error as AxiosError<{ detail: string }> | null
  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="email">{translation.login_email_label()}</FormLabel>
                <FormControl>
                  <Input
                    data-testid="email-input"
                    type="email"
                    placeholder={translation.login_email_placeholder()}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel data-testid="password">{translation.login_password_label()}</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      data-testid="password-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={translation.login_password_placeholder()}
                      className="pr-10"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="is_save_session"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="cursor-pointer font-normal">
                  {translation.login_remember_me()}
                </FormLabel>
              </FormItem>
            )}
          />

          {serverError && (
            <TypographyP className="mt-0! text-sm text-destructive">
              {serverError?.response?.data?.detail || translation.login_failed()}
            </TypographyP>
          )}

          <Button
            type="submit"
            data-testid="login-button"
            className="w-full"
            disabled={isPending || !isValid}
            loading={isPending}
          >
            {translation.login_submit()}
          </Button>
        </form>
      </Form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <TypographyMuted className="bg-card px-2">
            {translation.login_or_continue_with()}
          </TypographyMuted>
        </div>
      </div>

      <Button
        loading={isGettingGoogleLoginURL}
        onClick={() => getGoogleLoginURL({ provider: SsoProviders.google })}
        disabled={isGettingGoogleLoginURL}
        variant="outline"
        className="w-full"
        type="button"
        data-testid="login-google"
      >
        <GoogleIcon className="size-4" />
        {translation.login_google()}
      </Button>

      <div className="mt-4 text-center text-sm">
        <TypographyMuted>
          {translation.login_no_account()}{' '}
          <Link
            to="/register"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {translation.login_register_link()}
          </Link>
        </TypographyMuted>
      </div>
    </>
  )
}
