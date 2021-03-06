module AGame {
	export class HandlerObserver implements IHandlerObserver{
		private m_pObserverMap:Object = {};// 保存

		public registerObserver( notificationName:any, observer:IObserver ):void
		{
			var observers:IObserver[] = this.m_pObserverMap[ notificationName ];
			if( observers )
				observers.push( observer );
			else
				this.m_pObserverMap[ notificationName ] = [ observer ];
		}

		public removeObserver( notificationName:any, notifyContext:any ):void
		{
			var observers:IObserver[] = this.m_pObserverMap[ notificationName ];

			var i:number = observers.length;
			while( i-- )
			{
				var observer:IObserver = observers[i];
				if( observer.compareNotifyContext(notifyContext) )
				{
					observers.splice( i, 1 );
					break;
				}
			}
			
			if( observers.length == 0 )
				delete this.m_pObserverMap[ notificationName ];
		}

		public notifyObservers( notification:INotification ):void
		{
			var notificationName:any = notification.getName();
			var observersRef = this.m_pObserverMap[notificationName];
			if( observersRef )
			{
				var observers = observersRef.slice(0);
				var len = observers.length;
				for( var i=0; i<len; i++ )
				{
					var observer = observers[i];
					observer.notifyObserver(notification);
				}
			}
		}
	}

	export class Router implements IRouter{
		private m_pCommandMap:Object = null;
		private m_pObserver:HandlerObserver;
		
		constructor()
		{
			if( Router.instance )
				throw Error( Router.SINGLETON_MSG );

			Router.instance = this;
			this.m_pCommandMap = {};
			this.initializeRouter();
		}

		public getObserver():IHandlerObserver{
			return this.m_pObserver;
		}

		initializeRouter():void
		{
			this.m_pObserver = new HandlerObserver();
		}

		executeRouter( notification:INotification ):void
		{
			var commandClassRef:any = this.m_pCommandMap[ notification.getName() ];
			if( commandClassRef )
			{
				var command:IController = <IController> new commandClassRef();
				command.execute( notification );
			}
		}

		registerRouter( notificationName:any, commandClassRef:Function ):void
		{
			if( !this.m_pCommandMap[ notificationName ] )
				this.m_pObserver.registerObserver( notificationName, new Observer( this.executeRouter, this ) );
			this.m_pCommandMap[ notificationName ] = commandClassRef;
		}
		
		hasRouter( notificationName:any ):boolean
		{
			return this.m_pCommandMap[ notificationName ] != null;
		}

		removeRouter( notificationName:string ):void
		{
			if( this.hasRouter( notificationName ) )
			{
				this.m_pObserver.removeObserver( notificationName, this );			
				delete this.m_pCommandMap[notificationName];
			}
		}

		public notifyObservers( notification:INotification ):void{
			this.m_pObserver.notifyObservers(notification);
		}
		
		static instance:Router;

		static SINGLETON_MSG:string = "Router singleton already constructed!";
		
		
		static get Instance():Router
		{
			if( !Router.instance )
				Router.instance = new Router();

			return Router.instance;
		}
	}

	
}