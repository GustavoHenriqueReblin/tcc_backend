import { AccountsPayableService } from "./accountsPayable.service";
import { AccountsReceivableService } from "./accountsReceivable.service";
import { AssetService } from "./asset.service";
import { AssetCategoryService } from "./assetCategory.service";
import { AssetMaintenanceService } from "./assetMaintenance.service";
import { AuthService } from "./auth.service";
import { CityService } from "./city.service";
import { CountryService } from "./country.service";
import { CustomerService } from "./customer.service";
import { DeliveryAddressService } from "./deliveryAddress.service";
import { FinancialTransactionService } from "./financialTransaction.service";
import { InventoryMovementService } from "./inventoryMovement.service";
import { LotService } from "./lot.service";
import { ProductService } from "./product.service";
import { ProductDefinitionService } from "./productDefinition.service";
import { ProductionOrderService } from "./productionOrder.service";
import { ProductionOrderInputService } from "./productionOrderInput.service";
import { PurchaseOrderService } from "./purchaseOrder.service";
import { PurchaseOrderItemService } from "./purchaseOrderItem.service";
import { RecipeService } from "./recipe.service";
import { RecipeItemService } from "./recipeItem.service";
import { SaleOrderService } from "./saleOrder.service";
import { SaleOrderItemService } from "./saleOrderItem.service";
import { StateService } from "./state.service";
import { SupplierService } from "./supplier.service";
import { UnityService } from "./unity.service";
import { UserService } from "./user.service";
import { WarehouseService } from "./warehouse.service";

export const accountsPayableService = new AccountsPayableService();
export const accountsReceivableService = new AccountsReceivableService();
export const assetService = new AssetService();
export const assetCategoryService = new AssetCategoryService();
export const assetMaintenanceService = new AssetMaintenanceService();
export const authService = new AuthService();
export const cityService = new CityService();
export const countryService = new CountryService();
export const customerService = new CustomerService();
export const deliveryAddressService = new DeliveryAddressService();
export const financialTransactionService = new FinancialTransactionService();
export const inventoryMovementService = new InventoryMovementService();
export const lotService = new LotService();
export const productService = new ProductService();
export const productDefinitionService = new ProductDefinitionService();
export const productionOrderService = new ProductionOrderService();
export const productionOrderInputService = new ProductionOrderInputService();
export const purchaseOrderService = new PurchaseOrderService();
export const purchaseOrderItemService = new PurchaseOrderItemService();
export const recipeService = new RecipeService();
export const recipeItemService = new RecipeItemService();
export const saleOrderService = new SaleOrderService();
export const saleOrderItemService = new SaleOrderItemService();
export const stateService = new StateService();
export const supplierService = new SupplierService();
export const unityService = new UnityService();
export const userService = new UserService();
export const warehouseService = new WarehouseService();

export {
    AccountsPayableService,
    AccountsReceivableService,
    AssetService,
    AssetCategoryService,
    AssetMaintenanceService,
    AuthService,
    CityService,
    CountryService,
    CustomerService,
    DeliveryAddressService,
    FinancialTransactionService,
    InventoryMovementService,
    LotService,
    ProductService,
    ProductDefinitionService,
    ProductionOrderService,
    ProductionOrderInputService,
    PurchaseOrderService,
    PurchaseOrderItemService,
    RecipeService,
    RecipeItemService,
    SaleOrderService,
    SaleOrderItemService,
    StateService,
    SupplierService,
    UnityService,
    UserService,
    WarehouseService,
};
