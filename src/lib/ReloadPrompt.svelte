<script>
	import { useRegisterSW } from 'virtual:pwa-register/svelte'
	const {
		needRefresh,
		updateServiceWorker,
		offlineReady
	} = useRegisterSW({
		onRegistered(r) {
			console.log(`SW Registered: ${r}`)
		},
		onRegisterError(error) {
			console.log('SW registration error', error)
		},
	})

	$:
	if ($needRefresh) {
		updateServiceWorker(true)
	}

	$:
	if ($offlineReady) {
		console.log('App ready to work offline')
	}
</script>
