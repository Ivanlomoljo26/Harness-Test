import { shouldRunApp } from '../../../config/apps';
import { test } from '../../../harness/fixtures';
import { QashAdapter, type QashContactDetails } from '../adapter';

const hasAuthProfile = Boolean(
  process.env.QASH_AUTH_USER_DATA_DIR ||
    process.env.APP_AUTH_USER_DATA_DIR ||
    process.env.QASH_AUTH_CDP_ENDPOINT ||
    process.env.APP_AUTH_CDP_ENDPOINT
);

test.describe('Qash Finance Contact Book', () => {
  test.skip(!shouldRunApp('qash'), 'E2E_APP does not include Qash Finance');
  test.skip(
    !hasAuthProfile,
    'QASH_AUTH_USER_DATA_DIR, APP_AUTH_USER_DATA_DIR, QASH_AUTH_CDP_ENDPOINT, or APP_AUTH_CDP_ENDPOINT is required.'
  );

  test('contact-book-add-contact-validation-smoke', async ({ authenticatedAppPage, steps, timeline }) => {
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_contact_book', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.openContactBook();
    }, {
      screenshots: [{ name: 'contact-book', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('open_add_contact', async () => {
      await app.startAddContact();
      await app.assertAddContactFormReady();
    }, {
      screenshots: [{ name: 'add-contact', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('select_employee_contact_type', async () => {
      await app.selectContactType('Employee');
      await app.assertContactDetailsFormReady();
    }, {
      screenshots: [{ name: 'employee-contact-form', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });

  test('contact-book-create-employee-contact', async ({ authenticatedAppPage, steps, timeline }) => {
    test.skip(
      process.env.QASH_CREATE_CONTACT !== 'true',
      'Set QASH_CREATE_CONTACT=true to submit a stateful Qash employee contact creation flow.'
    );
    test.skip(
      !process.env.QASH_CONTACT_WALLET_ADDRESS,
      'QASH_CONTACT_WALLET_ADDRESS is required to create a Qash contact.'
    );

    const uniqueSuffix = Date.now().toString();
    const groupName = process.env.QASH_CONTACT_GROUP ?? `Pioneer E2E Group ${uniqueSuffix}`;
    const shouldCreateGroup = !process.env.QASH_CONTACT_GROUP || process.env.QASH_CREATE_CONTACT_GROUP === 'true';
    const contact: QashContactDetails = {
      name: process.env.QASH_CONTACT_NAME ?? `Pioneer E2E Contact ${uniqueSuffix}`,
      email: process.env.QASH_CONTACT_EMAIL ?? `pioneer.e2e+${uniqueSuffix}@example.com`,
      walletAddress: process.env.QASH_CONTACT_WALLET_ADDRESS ?? '',
      groupName
    };
    const app = new QashAdapter(authenticatedAppPage, timeline);

    await steps.step('open_contact_book', async () => {
      await app.open();
      await app.assertAuthenticatedShellReady();
      await app.openContactBook();
    }, {
      screenshots: [{ name: 'contact-book', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    if (shouldCreateGroup) {
      await steps.step('create_contact_group', async () => {
        await app.createContactGroup(groupName);
      }, {
        screenshots: [{ name: 'contact-group-created', page: authenticatedAppPage }],
        snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
      });
    }

    await steps.step('open_employee_contact_form', async () => {
      await app.startAddContact();
      await app.assertAddContactFormReady();
      await app.selectContactType('Employee');
      await app.assertContactDetailsFormReady();
    }, {
      screenshots: [{ name: 'employee-contact-form', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('fill_employee_contact_details', async () => {
      await app.fillContactDetails(contact);
      await app.assertContactReadyToSubmit();
    }, {
      screenshots: [{ name: 'employee-contact-filled', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });

    await steps.step('submit_employee_contact', async () => {
      await app.submitContact();
      await app.assertContactCreated(contact);
    }, {
      screenshots: [{ name: 'employee-contact-created', page: authenticatedAppPage }],
      snapshots: [{ name: 'app-state', capture: () => app.captureAppState() }]
    });
  });
});
