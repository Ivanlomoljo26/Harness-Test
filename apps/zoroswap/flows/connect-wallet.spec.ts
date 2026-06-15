import { shouldRunApp } from '../../../config/apps';
import { expect, test } from '../../../harness/fixtures';
import { ZoroSwapAdapter } from '../adapter';

test.describe('ZoroSwap wallet connection', () => {
  test.skip(!shouldRunApp('zoroswap'), 'E2E_APP does not include ZoroSwap');

  test('connect-wallet-smoke', async ({ walletBrowser, runtimeConfig, steps, timeline }) => {
    const app = new ZoroSwapAdapter(walletBrowser.appPage, timeline);

    await steps.step('open_app', async () => {
      await app.open();
      await app.assertReady();
    }, {
      screenshots: [{ name: 'app', page: walletBrowser.appPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('prepare_wallet', async () => {
      await walletBrowser.wallet.prepareWallet();
      await walletBrowser.wallet.assertNetwork(runtimeConfig.network.name);
      await walletBrowser.wallet.assertDappBridgeInjected(walletBrowser.appPage);
    }, {
      screenshots: [
        { name: 'app', page: walletBrowser.appPage },
        { name: 'wallet', page: walletBrowser.wallet.page }
      ],
      snapshots: [{ name: 'wallet-state', capture: () => walletBrowser.wallet.captureWalletState(walletBrowser.appPage) }]
    });

    await steps.step('connect_wallet', async () => {
      await app.connectWallet();
      await walletBrowser.wallet.confirmations.approveNext('connect');
      await app.assertWalletConnected();
      const permission = await walletBrowser.wallet.waitForDappPermission(walletBrowser.appPage);
      expect(permission.address).toMatch(/^m[a-z]{1,4}1/i);
    }, {
      screenshots: [{ name: 'app-connected', page: walletBrowser.appPage }],
      snapshots: [
        { name: 'app-state', capture: () => app.captureAppState() },
        { name: 'wallet-state', capture: () => walletBrowser.wallet.captureWalletState(walletBrowser.appPage) }
      ]
    });
  });
});
